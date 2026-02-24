import { Agent, type AgentInputItem, run, type RunState, system } from '@openai/agents';
import { actionId } from '../ink/contexts/ActionsContext';
import { globalPlanContext } from '../ink/contexts/globalPlanContext';
import { addListener, curryEmitToListeners, emitToListeners, onceListener } from '../ink/emitters/listener';
import { handleExit } from '../lifecycle/handleExit';
import type { CombinedSession } from '../lifecycle/session';
import { trackedState } from '../lifecycle/trackedState';
import { sleep } from '../utils/promises/sleep';
import { costTracker } from '../utils/sessions/cost';
import { rateLimitTracker } from '../utils/sessions/rateLimits';
import { isTrue } from '../utils/strings/isTrue';
import { showErrorToUser } from './showErrorToUser';

export async function runAgentForOnePass(
	agent: Agent,
	session: CombinedSession,
	input: string | AgentInputItem[] | RunState<undefined, Agent>,
	controller: AbortController,
): Promise<null | RunState<undefined, Agent>> {
	let lastToolCallInfo: string | null = null;
	const toolInfoMap = new Map<string, any>();
	const removeToolListener = addListener('RegisterToolInfo', (info) => {
		toolInfoMap.set(info.callId, info);
	});

	try {
		let hasStartedResponse = false;

		// If there is no plan yet, prepend a system instruction guiding the model to establish one first
		let adjustedInput = input;
		const noPlanYet = globalPlanContext.planItems.length === 0
			&& (!globalPlanContext.planDescription || globalPlanContext.planDescription.trim().length === 0);
		if (noPlanYet && (typeof input === 'string' || Array.isArray(input))) {
			const planningInstruction = [
				'If there is no current plan, first establish one and keep it updated:',
				'- Use the tools to manage the plan:',
				'  • set_plan_description(description)',
				'  • set_plan_items(items: string[])',
				'  • add_plan_item(text)',
				"  • update_plan_item(id, text, status: 'todo' | 'in-progress' | 'done' | 'not-needed' | 'unchanged')",
				'- After setting the plan, as you progress, mark items as in-progress, done, or not-needed.',
				'- Keep the plan concise and actionable. Update statuses as you move forward.',
			].join('\n');
			if (typeof input === 'string') {
				adjustedInput = [
					system(planningInstruction),
					{ type: 'message', role: 'user', content: input } as AgentInputItem,
				];
			} else {
				adjustedInput = [system(planningInstruction), ...input as AgentInputItem[]];
			}
		}

		const stream = await run(agent, adjustedInput as any, {
			session,
			stream: true,
			signal: controller.signal,
			maxTurns: trackedState.maxTurns,
		});

		for await (const event of stream) {
			// Rate limit monitoring: if approaching limits, either slow down or require approval
			if (trackedState.monitorRateLimits) {
				const { requests, tokens } = rateLimitTracker.isApproachingLimit(trackedState.rateLimitThreshold);
				const veryCloseThreshold = Math.min(99, trackedState.rateLimitThreshold + 15);
				const veryClose = rateLimitTracker.isApproachingLimit(veryCloseThreshold);
				if (veryClose.requests || veryClose.tokens) {
					// Pause and require approval
					emitToListeners('SetInputMode', 'approving');
					emitToListeners('PushNewMessages', [{
						type: 'agent',
						text: 'Rate limit nearly exhausted. Approve to continue or wait for reset.',
						version: 1,
					}]);
					const approval = await new Promise<'approved' | 'denied'>((resolve) => {
						const removeApprove = addListener('ApproveCurrentApproval', () => {
							removeApprove();
							removeDeny();
							resolve('approved');
						});
						const removeDeny = addListener('DenyCurrentApproval', () => {
							removeApprove();
							removeDeny();
							resolve('denied');
						});
					});
					if (approval === 'denied') {
						emitToListeners('SetInputMode', 'denied');
						emitToListeners('PushNewMessages', [{
							type: 'agent',
							text: 'Operation canceled due to rate limits.',
							version: 1,
						}]);
						if (controller) { controller.abort(); }
						process.exitCode = 1;
						await handleExit();
					}
				} else if (requests || tokens) {
					// Artificially slow down
					emitToListeners('PushNewMessages', [{ type: 'agent', text: 'Throttling to avoid rate limits…', version: 1 }]);
					// Try to honor reset headers if present
					const status = rateLimitTracker.getStatus();
					let backoffMs = 1500;
					const parseReset = (s?: string | null) => {
						if (!s) { return null; }
						// expected formats like "1ms", "20s", "1m0s"
						const ms = /([0-9]+)ms/.exec(s)?.[1];
						if (ms) { return parseInt(ms, 10); }
						const sec = /([0-9]+)s/.exec(s)?.[1];
						if (sec) { return parseInt(sec, 10) * 1000; }
						const min = /([0-9]+)m/.exec(s)?.[1];
						if (min) { return parseInt(min, 10) * 60_000; }
						return null;
					};
					const resets = [parseReset(status.resetRequests || undefined), parseReset(status.resetTokens || undefined)]
						.filter(Boolean) as number[];
					if (resets.length > 0) {
						backoffMs = Math.max(backoffMs, Math.min(...resets));
					}
					await sleep(backoffMs);
				}
			}
			switch (event.type) {
				case 'raw_model_stream_event':
					const data = event.data;
					switch (data.type) {
						case 'response_started':
							break;
						case 'output_text_delta':
							if (!hasStartedResponse) {
								emitToListeners('PushNewMessages', [{ type: 'agent', text: data.delta, version: 1 }]);
								hasStartedResponse = true;
							} else {
								emitToListeners('UpdateLastMessageText', data.delta);
							}
							break;
						case 'response_done':
							const tier = (data as any).response?.providerData?.service_tier
								|| (data as any).providerData?.service_tier;
							if (tier) {
								(stream.state.usage as any).serviceTier = tier;
								const entries = stream.state.usage.requestUsageEntries;
								if (entries && entries.length > 0) {
									(entries[entries.length - 1] as any).serviceTier = tier;
								}
							}
							emitToListeners('SetInputMode', 'waiting');
							break;
					}
					// Update cost and tokens during the stream whenever new data arrives
					const currentEstimatedCost = costTracker.getEstimatedTotalCost(
						stream.state.usage,
						trackedState.model,
						trackedState.compactionModel,
					);
					const sessionStats = costTracker.getSessionStats();
					emitToListeners('UpdateCost', {
						totalCost: currentEstimatedCost,
						inputTokens: sessionStats.inputTokens + stream.state.usage.inputTokens,
						outputTokens: sessionStats.outputTokens + stream.state.usage.outputTokens,
						cachedInputTokens: sessionStats.cachedInputTokens
							+ costTracker.extractCachedTokens(stream.state.usage.inputTokensDetails),
						hasUnknownPrices: sessionStats.hasUnknownPrices,
					});
					break;
				case 'run_item_stream_event':
					if (event.name === 'tool_called') {
						const item: any = event.item.rawItem ?? event.item;
						const name = item.name || item.type || 'tool';
						let args: string = typeof item.arguments === 'string'
							? item.arguments
							: item.arguments
							? JSON.stringify(item.arguments)
							: '';

						if (!args && item.type === 'shell_call' && item.action?.commands) {
							args = JSON.stringify(item.action.commands);
						}

						if (!args && item.type === 'apply_patch_call' && item.operation) {
							args = JSON.stringify(item.operation);
						}

						const displayedArgs = args
							? `(${args})`
							: '()';
						const callId = item.callId || (item as any).id;
						emitToListeners('PushNewMessages', [{
							type: 'tool',
							text: name,
							args: displayedArgs,
							version: 1,
							callId,
						}]);
						// Also add to ACTIONS pane generically
						emitToListeners('AddActionItem', {
							kind: name === 'apply_patch' || item.type === 'apply_patch_call'
								? 'apply_patch'
								: (name === 'create_new_harper_application' ? 'create_app' : 'tool'),
							title: name,
							detail: displayedArgs,
							running: false,
							callId,
						});
						// Save context for potential error reporting later
						lastToolCallInfo = `${name}${displayedArgs}`;
					}
					break;
			}

			if (trackedState.maxCost !== null) {
				const estimatedTotalCost = costTracker.getEstimatedTotalCost(
					stream.state.usage,
					trackedState.model || 'gpt-5.2',
					trackedState.compactionModel || 'gpt-5-nano',
				);
				if (estimatedTotalCost > trackedState.maxCost) {
					emitToListeners('SetInputMode', 'denied');
					setTimeout(curryEmitToListeners('SetInputMode', 'waiting'), 1000);
					// When we hit the max cost, we can stop thinking; we're about to exit.
					emitToListeners('SetThinking', false);
					emitToListeners('PushNewMessages', [{
						type: 'agent',
						text: `Cost limit exceeded: $${estimatedTotalCost.toFixed(4)} > $${trackedState.maxCost.toFixed(4)}`,
						version: 1,
					}]);
					if (controller) {
						controller.abort();
					}
					process.exitCode = 1;
					await handleExit();
				}
			}

			// No break here - let the stream finish naturally so we can capture all events
			// and potential multiple interruptions in one turn.
		} // end of stream events loop

		const estimatedTotalCost = costTracker.getEstimatedTotalCost(
			stream.state.usage,
			trackedState.model,
			trackedState.compactionModel,
		);
		const sessionStats = costTracker.getSessionStats();
		emitToListeners('UpdateCost', {
			totalCost: estimatedTotalCost,
			inputTokens: sessionStats.inputTokens + stream.state.usage.inputTokens,
			outputTokens: sessionStats.outputTokens + stream.state.usage.outputTokens,
			cachedInputTokens: sessionStats.cachedInputTokens
				+ costTracker.extractCachedTokens(stream.state.usage.inputTokensDetails),
			hasUnknownPrices: sessionStats.hasUnknownPrices,
		});

		if (stream.interruptions?.length) {
			// When we're interrupted and need to ask for approval, we can stop thinking.
			emitToListeners('SetThinking', false);
			emitToListeners('SetInputMode', 'approving');

			for (const interruption of stream.interruptions) {
				const callId = (interruption as any).callId || (interruption as any).id;
				const toolName = interruption.toolName;
				const isModalTool = toolName === 'apply_patch' || toolName === 'code_interpreter' || toolName === 'shell';

				// Track ACTION item for approval with an explicit id so we can update
				const myApprovalId = actionId;
				emitToListeners('AddActionItem', {
					id: myApprovalId,
					kind: isModalTool ? (toolName === 'apply_patch' ? 'apply_patch' : 'approval') : 'approval',
					title: isModalTool ? toolName : 'approval',
					detail: lastToolCallInfo ?? 'awaiting approval',
					running: true,
					callId,
				});

				// Prepare approval via overlay events
				const approvalPromise = new Promise<'approved' | 'denied'>((resolve) => {
					const removeApprove = addListener('ApproveCurrentApproval', () => {
						removeApprove();
						removeDeny();
						resolve('approved');
					});
					const removeDeny = addListener('DenyCurrentApproval', () => {
						removeApprove();
						removeDeny();
						resolve('denied');
					});
				});

				let result: 'approved' | 'denied';
				if (isModalTool) {
					// For modal tools, do NOT allow text input shortcut; rely on overlay which enforces 1s guard
					result = await approvalPromise;
				} else {
					// Fallback to text input for non-patch approvals
					const textInputPromise = onceListener('PushNewMessages').then(messages => {
						let approved = false;
						for (const newMessage of messages) {
							if (newMessage.type === 'user' && isTrue(newMessage.text)) {
								approved = true;
							}
							newMessage.handled = true;
						}
						return approved ? 'approved' : 'denied' as const;
					});
					result = await Promise.race([approvalPromise, textInputPromise]);
				}

				if (result === 'approved') {
					emitToListeners('SetInputMode', 'approved');
					// Update approval action item
					emitToListeners('UpdateActionItem', {
						id: myApprovalId,
						running: false,
						status: 'approved',
						detail: (lastToolCallInfo ?? '') + ' approved',
					});
					stream.state.approve(interruption);
				} else {
					emitToListeners('SetInputMode', 'denied');
					emitToListeners('UpdateActionItem', {
						id: myApprovalId,
						running: false,
						status: 'denied',
						detail: (lastToolCallInfo ?? '') + ' denied',
					});
					stream.state.reject(interruption);
				}
				// Close the viewer if it was open
				emitToListeners('CloseApprovalViewer', undefined);
			}

			// After we finish gathering approvals or denials, we will start thinking again.
			emitToListeners('SetThinking', true);
			setTimeout(curryEmitToListeners('SetInputMode', 'waiting'), 1000);
			removeToolListener();
			return stream.state;
		} else {
			costTracker.recordTurn(
				trackedState.model,
				stream.state.usage,
				trackedState.compactionModel,
			);
			emitToListeners('UpdateCost', costTracker.getSessionStats());
		}

		removeToolListener();
		return null;
	} catch (error: any) {
		showErrorToUser(error, lastToolCallInfo);
		return null;
	}
}

import { Agent, type AgentInputItem, run, type RunState } from '@openai/agents';
import { actionId } from '../ink/contexts/ActionsContext';
import { curryEmitToListeners, emitToListeners, onceListener } from '../ink/emitters/listener';
import { handleExit } from '../lifecycle/handleExit';
import type { CombinedSession } from '../lifecycle/session';
import { trackedState } from '../lifecycle/trackedState';
import { costTracker } from '../utils/sessions/cost';
import { isTrue } from '../utils/strings/isTrue';
import { showErrorToUser } from './showErrorToUser';

export async function runAgentForOnePass(
	agent: Agent,
	session: CombinedSession,
	input: string | AgentInputItem[] | RunState<undefined, Agent>,
	controller: AbortController,
): Promise<null | RunState<undefined, Agent>> {
	let lastToolCallInfo: string | null = null;

	try {
		let hasStartedResponse = false;

		const stream = await run(agent, input, {
			session,
			stream: true,
			signal: controller.signal,
			maxTurns: trackedState.maxTurns,
		});

		for await (const event of stream) {
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
						emitToListeners('PushNewMessages', [{
							type: 'tool',
							text: name,
							args: displayedArgs,
							version: 1,
						}]);
						// Also add to ACTIONS pane generically
						emitToListeners('AddActionItem', {
							kind: name === 'apply_patch' || item.type === 'apply_patch_call'
								? 'apply_patch'
								: (name === 'create_new_harper_application' ? 'create_app' : 'tool'),
							title: name,
							detail: displayedArgs,
							running: false,
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
					trackedState.compactionModel || 'gpt-4o-mini',
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
		emitToListeners('UpdateCost', {
			...costTracker.getSessionStats(),
			totalCost: estimatedTotalCost,
		});

		if (stream.interruptions?.length) {
			// When we're interrupted and need to ask for approval, we can stop thinking.
			emitToListeners('SetThinking', false);
			emitToListeners('SetInputMode', 'approving');

			for (const interruption of stream.interruptions) {
				// Track ACTION item for approval with an explicit id so we can update
				const myApprovalId = actionId;
				emitToListeners('AddActionItem', {
					id: myApprovalId,
					kind: 'approval',
					title: 'approval',
					detail: lastToolCallInfo ?? 'awaiting approval',
					running: true,
				});
				const newMessages = await onceListener('PushNewMessages');
				let approved = false;
				for (const newMessage of newMessages) {
					if (newMessage.type === 'user' && isTrue(newMessage.text)) {
						approved = true;
					}
					newMessage.handled = true;
				}
				if (approved) {
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
			}

			// After we finish gathering approvals or denials, we will start thinking again.
			emitToListeners('SetThinking', true);
			setTimeout(curryEmitToListeners('SetInputMode', 'waiting'), 1000);
			return stream.state;
		} else {
			costTracker.recordTurn(
				trackedState.model,
				stream.state.usage,
				trackedState.compactionModel,
			);
			emitToListeners('UpdateCost', costTracker.getSessionStats());
		}

		return null;
	} catch (error: any) {
		showErrorToUser(error, lastToolCallInfo);
		return null;
	}
}

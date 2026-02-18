import { Agent, run } from '@openai/agents';
import { emitToListeners } from '../ink/emitters/listener';
import type { Config } from '../ink/models/config';
import { defaultInstructions } from '../lifecycle/defaultInstructions';
import { getModel, isOpenAIModel } from '../lifecycle/getModel';
import { readAgentsMD } from '../lifecycle/readAgentsMD';
import { trackedState } from '../lifecycle/trackedState';
import { createTools } from '../tools/factory';
import { checkForUpdate } from '../utils/package/checkForUpdate';
import { costTracker } from '../utils/sessions/cost';
import { createSession } from '../utils/sessions/createSession';
import { modelSettings } from '../utils/sessions/modelSettings';
import { getStdin } from '../utils/shell/getStdin';

export class AgentManager {
	private isInitialized = false;
	private shellCommandCount = 0;

	public async initialize(config: Config) {
		if (this.isInitialized) { return; }

		await checkForUpdate();

		trackedState.model = config.model;
		trackedState.compactionModel = config.compactionModel;

		// Set API keys if provided
		if (config.apiKey) {
			if (config.provider === 'OpenAI') { process.env.OPENAI_API_KEY = config.apiKey; }
			if (config.provider === 'Anthropic') { process.env.ANTHROPIC_API_KEY = config.apiKey; }
			if (config.provider === 'Google') { process.env.GOOGLE_GENERATIVE_AI_API_KEY = config.apiKey; }
		}

		trackedState.agent = new Agent({
			name: 'Harper App Development Assistant',
			model: isOpenAIModel(trackedState.model) ? trackedState.model : getModel(trackedState.model),
			modelSettings,
			instructions: readAgentsMD() || defaultInstructions(),
			tools: createTools(),
		});

		trackedState.session = createSession(trackedState.sessionPath);
		this.isInitialized = true;

		// Check for initial stdin prompt
		const stdinPrompt = await getStdin();
		if (stdinPrompt) {
			emitToListeners('PushNewMessages', [{ type: 'user', text: stdinPrompt }]);
			this.runTask(stdinPrompt);
		}
	}

	public async runTask(taskOrState: string | any) {
		if (!this.isInitialized || !trackedState.agent || !trackedState.session) {
			throw new Error('Agent not initialized');
		}

		emitToListeners('SetInputMode', 'thinking');

		try {
			trackedState.controller = new AbortController();
			const stream = await run(trackedState.agent, taskOrState, {
				session: trackedState.session,
				stream: true,
				signal: trackedState.controller.signal,
				maxTurns: trackedState.maxTurns,
			});
			trackedState.approvalState = null;

			let hasStartedResponse = false;

			for await (const event of stream) {
				switch (event.type) {
					case 'raw_model_stream_event':
						const data = event.data;
						switch (data.type) {
							case 'response_started':
								break;
							case 'output_text_delta':
								if (!hasStartedResponse) {
									emitToListeners('PushNewMessages', [{ type: 'agent', text: '' }]);
									hasStartedResponse = true;
								}
								emitToListeners('UpdateLastMessageText', data.text_delta);
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

							emitToListeners('PushNewMessages', [{
								type: 'tool',
								text: name,
								args: args,
							}]);

							if (name === 'shell' || name === 'shell_call') {
								this.shellCommandCount++;
								emitToListeners('AddShellCommand', {
									command: args,
									args: '',
									running: true,
								});
							}
						} else if (event.name === 'tool_call_finished') {
							const item: any = event.item.rawItem ?? event.item;
							const name = item.name || item.type || 'tool';

							if (name === 'shell' || name === 'shell_call') {
								const result: any = event.item.result;
								let exitCode = 0;
								if (typeof result === 'string') {
									const exitCodeMatch = result.match(/EXIT CODE: (\d+)/);
									if (exitCodeMatch) {
										exitCode = parseInt(exitCodeMatch[1], 10);
									}
								}

								emitToListeners('UpdateShellCommand', {
									id: this.shellCommandCount - 1,
									running: false,
									exitCode: exitCode,
								});
							}
						}
						break;

					case 'agent_updated_stream_event':
						emitToListeners('PushNewMessages', [{
							type: 'agent',
							text: `\n👤 Agent switched to: ${event.agent.name}`,
						}]);
						break;
				}

				if (trackedState.maxCost !== null) {
					const estimatedTotalCost = costTracker.getEstimatedTotalCost(
						stream.state.usage,
						trackedState.model || 'gpt-5.2',
						trackedState.compactionModel || 'gpt-4o-mini',
					);
					if (estimatedTotalCost > trackedState.maxCost) {
						if (trackedState.controller) {
							trackedState.controller.abort();
						}
						emitToListeners('PushNewMessages', [{
							type: 'agent',
							text: `Cost limit exceeded: $${estimatedTotalCost.toFixed(4)} > $${trackedState.maxCost.toFixed(4)}`,
						}]);
						return;
					}
				}
			}

			if (stream.interruptions?.length) {
				trackedState.approvalState = stream.state;
				emitToListeners('SetInputMode', 'approving');
			} else {
				emitToListeners('SetInputMode', 'waiting');
				costTracker.recordTurn(
					trackedState.model || 'gpt-5.2',
					stream.state.usage,
					trackedState.compactionModel || 'gpt-4o-mini',
				);
			}
		} catch (error: any) {
			emitToListeners('SetInputMode', 'waiting');
			if (error.name === 'AbortError') {
				emitToListeners('PushNewMessages', [{ type: 'interrupted', text: 'Thought interrupted.' }]);
				return;
			}

			// Build detailed error report
			const err: any = error ?? {};
			const name = err.name || 'Error';
			const message: string = err.message || String(err);
			const code = err.code ? ` code=${err.code}` : '';
			const status = err.status || err.statusCode || err.response?.status;
			const statusStr = status ? ` status=${status}` : '';
			const composed = `${name}:${code}${statusStr} ${message}`;

			emitToListeners('PushNewMessages', [{ type: 'agent', text: `Error: ${composed}` }]);
		}
	}

	public handleApproval(approved: boolean) {
		if (!trackedState.approvalState) { return; }

		const interruptions = trackedState.approvalState.interruptions;
		if (interruptions && interruptions.length > 0) {
			const interruption = interruptions[0];
			if (approved) {
				trackedState.approvalState.approve(interruption);
				emitToListeners('SetInputMode', 'approved');
			} else {
				trackedState.approvalState.reject(interruption);
				emitToListeners('SetInputMode', 'denied');
			}

			// Run the next turn with the approval state
			const state = trackedState.approvalState;
			trackedState.approvalState = null;
			this.runTask(state);
		}
	}

	public interrupt() {
		if (trackedState.controller) {
			trackedState.controller.abort();
		}
	}
}

export const agentManager = new AgentManager();

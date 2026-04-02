import { Agent, type AgentInputItem, type RunState, type Tool } from '@openai/agents';
import { curryEmitToListeners, emitToListeners } from '../ink/emitters/listener';
import type { Message } from '../ink/models/message';
import { defaultInstructions } from '../lifecycle/defaultInstructions';
import { getModel, getModelName, getProvider, isOpenAIModel } from '../lifecycle/getModel';
import { handleExit } from '../lifecycle/handleExit';
import { readAgentSkillsRoot } from '../lifecycle/readAgentSkillsRoot';
import type { CombinedSession } from '../lifecycle/session';
import { trackedState } from '../lifecycle/trackedState';
import { createCLITools, createSharedTools } from '../tools/factory';
import { logError } from '../utils/logger';
import { ensureOllamaModel } from '../utils/ollama/ensureOllamaModel';
import { sleep } from '../utils/promises/sleep';
import { createSession } from '../utils/sessions/createSession';
import { getModelSettings } from '../utils/sessions/modelSettings';
import { runAgentForOnePass } from './runAgentForOnePass';
import { translateSessionItemsToMessages } from './translateSessionItemsToMessages';

export type { Tool };

export class AgentManager {
	private isInitialized = false;
	private controller: AbortController | null = null;
	private queuedUserInputs: string[] = [];
	private resumeState: RunState<undefined, Agent> | null = null;

	public agent: Agent | null = null;
	public session: CombinedSession | null = null;
	public initialMessages: Message[] = [];

	public static instantiateAgent(tools: Tool[], instructions?: string) {
		return new Agent({
			name: 'Harper Agent',
			model: isOpenAIModel(trackedState.model) ? trackedState.model : getModel(trackedState.model),
			modelSettings: getModelSettings(trackedState.model),
			instructions: instructions || readAgentSkillsRoot() || defaultInstructions(),
			tools,
		});
	}

	public async initialize(agent?: Agent, session?: CombinedSession) {
		if (this.isInitialized) {
			return;
		}

		this.session = session || createSession(trackedState.sessionPath);
		this.agent = agent || AgentManager.instantiateAgent([
			...createSharedTools(this.session),
			...createCLITools(this.session),
		]);

		// Restore plan state from session storage, if present
		try {
			const plan = await this.session?.getPlanState?.();
			if (plan && typeof plan === 'object') {
				if (typeof plan.planDescription === 'string') {
					emitToListeners('SetPlanDescription', plan.planDescription);
				}
				if (Array.isArray(plan.planItems)) {
					emitToListeners('SetPlanItems', plan.planItems);
				}
			}
		} catch {}

		if (trackedState.sessionPath) {
			const items = await this.session.getItems();
			this.initialMessages = translateSessionItemsToMessages(items);
		}

		this.isInitialized = true;

		if (trackedState.prompt?.trim?.()?.length) {
			trackedState.autonomous = true;
			setTimeout(
				curryEmitToListeners('PushNewMessages', [
					{ type: 'prompt', text: trackedState.prompt.trim(), version: 1 },
				]),
				500,
			);
		} else if (!this.initialMessages?.length) {
			setTimeout(
				curryEmitToListeners('PushNewMessages', [
					{ type: 'agent', text: 'What would you like to create together?', version: 1 },
				]),
				500,
			);
		}
	}

	public enqueueUserInput(text: string) {
		if (text.trim().length > 0) {
			this.queuedUserInputs.push(text);
		}
	}

	public async runTask(task: string, isPrompt?: boolean) {
		this.controller = new AbortController();

		await this.runCompactionIfWeWereIdle();

		if (getProvider(trackedState.model) === 'Ollama') {
			try {
				const modelName = getModelName(trackedState.model);
				await ensureOllamaModel(modelName, (progress) => {
					emitToListeners('SetPulling', {
						modelName,
						status: progress.status,
						completed: progress.completed ?? 0,
						total: progress.total ?? 0,
					});
				});
				emitToListeners('SetPulling', null);
			} catch (err) {
				emitToListeners('SetPulling', null);
				logError(err);
			}
		}

		// We think while the pass executes.
		emitToListeners('SetThinking', true);

		let taskOrState: null | string | AgentInputItem[] | RunState<undefined, Agent> = task;

		// Handle resumption if the user asked to continue
		const lowerTask = task.toLowerCase();
		if (
			this.resumeState
			&& (lowerTask.includes('continue') || lowerTask.includes('keep going') || lowerTask.includes('more')
				|| lowerTask === 'y' || lowerTask === 'yes')
		) {
			taskOrState = this.resumeState;
			this.resumeState = null;
		} else {
			// New task, clear any previous resume state
			this.resumeState = null;
		}

		while (taskOrState) {
			taskOrState = await runAgentForOnePass(this.agent!, this.session!, taskOrState, this.controller, isPrompt);

			if (taskOrState && !trackedState.autonomous) {
				// If we have state but no interruptions, it means we hit max turns
				if (taskOrState.getInterruptions().length === 0) {
					this.resumeState = taskOrState;
					emitToListeners('SetThinking', false);
					emitToListeners('PushNewMessages', [{
						type: 'interrupted',
						text: `Would you like me to continue?`,
						version: 1,
					}]);
					break;
				}
			}

			if (trackedState.autonomous && !this.resumeState) {
				// If autonomous and the plan is 100% completed, we can exit.
				const planState = await this.session!.getPlanState();
				const planItems = planState.planItems;
				const hasPlan = planItems.length > 0;
				const allDone = hasPlan && planItems.every(item => item.status === 'done' || item.status === 'not-needed');
				if (allDone) {
					emitToListeners('SetThinking', false);
					emitToListeners('PushNewMessages', [{
						type: 'agent',
						text: 'Plan 100% accomplished. Exiting autonomous mode.',
						version: 1,
					}]);
					// Allow some time for the message to be seen or for any final UI updates
					await sleep(1000);
					await handleExit();
				} else {
					// In autonomous mode, we might want to run compaction between loops to keep the context clean
					await sleep(1_000);
					await this.session?.runCompaction({ force: true });
					trackedState.currentTurn = 0;
					this.resumeState = null;
					this.controller = new AbortController();
					taskOrState = 'Keep going';
				}
			}
		}

		// When the pass finishes execution, we can stop thinking.
		emitToListeners('SetThinking', false);

		// If any user inputs arrived while thinking, batch them and kick off a new run immediately.
		if (this.queuedUserInputs.length > 0) {
			const batched = this.queuedUserInputs.splice(0).join('\n\n');
			// Fire-and-forget next run with batched messages
			void this.runTask(batched);
		}
	}

	private async runCompactionIfWeWereIdle() {
		if (this.session) {
			// Determine idle duration from provider-stamped timestamps in history using
			// the session helper (does not require fetching history).
			const lastTs = await this.session.getLatestAddedTimestamp();
			if (typeof lastTs === 'number' && Number.isFinite(lastTs)) {
				const ONE_HOUR_MS = 60 * 60 * 1000;
				const idleMs = Date.now() - lastTs;
				if (idleMs > ONE_HOUR_MS) {
					try {
						await this.session.runCompaction({ force: true });
					} catch (err) {
						logError(err);
					}
				}
			}
		}
	}

	public interrupt() {
		if (this.controller) {
			this.controller.abort();
		}
	}
}

export const agentManager = new AgentManager();

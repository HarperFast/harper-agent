import { Agent, type AgentInputItem, type RunState } from '@openai/agents';
import { globalPlanContext } from '../ink/contexts/globalPlanContext';
import { addListener, curryEmitToListeners, emitToListeners } from '../ink/emitters/listener';
import type { Message } from '../ink/models/message';
import { defaultInstructions } from '../lifecycle/defaultInstructions';
import { getModel, isOpenAIModel } from '../lifecycle/getModel';
import { handleExit } from '../lifecycle/handleExit';
import { readAgentSkillsRoot } from '../lifecycle/readAgentSkillsRoot';
import type { CombinedSession } from '../lifecycle/session';
import { trackedState } from '../lifecycle/trackedState';
import { createTools } from '../tools/factory';
import { logError } from '../utils/logger';
import { sleep } from '../utils/promises/sleep';
import { createSession } from '../utils/sessions/createSession';
import { getModelSettings } from '../utils/sessions/modelSettings';
import { runAgentForOnePass } from './runAgentForOnePass';

export class AgentManager {
	private isInitialized = false;
	private controller: AbortController | null = null;
	private queuedUserInputs: string[] = [];
	private resumeState: RunState<undefined, Agent> | null = null;

	public agent: Agent | null = null;
	public session: CombinedSession | null = null;
	public initialMessages: Message[] = [];

	public async initialize() {
		if (this.isInitialized) {
			return;
		}

		this.agent = new Agent({
			name: 'Harper Agent',
			model: isOpenAIModel(trackedState.model) ? trackedState.model : getModel(trackedState.model),
			modelSettings: getModelSettings(trackedState.model),
			instructions: readAgentSkillsRoot() || defaultInstructions(),
			tools: createTools(),
		});
		this.session = createSession(trackedState.sessionPath);

		// Restore plan state from session storage, if present
		try {
			const plan = await this.session?.getPlanState?.();
			if (plan && typeof plan === 'object') {
				if (typeof plan.planDescription === 'string') {
					globalPlanContext.planDescription = plan.planDescription;
					emitToListeners('SetPlanDescription', plan.planDescription);
				}
				if (Array.isArray(plan.planItems)) {
					globalPlanContext.planItems = plan.planItems;
					// compute progress like PlanProvider does
					const completedCount = plan.planItems.filter((it) =>
						it?.status === 'done' || it?.status === 'not-needed'
					).length;
					const progress = plan.planItems.length === 0 ? 0 : Math.round((completedCount / plan.planItems.length) * 100);
					globalPlanContext.progress = progress;
					emitToListeners('SetPlanItems', plan.planItems);
				}
			}
		} catch {}

		// Persist plan state changes to session storage
		try {
			addListener('SetPlanDescription', async (desc: string) => {
				try {
					await this.session?.setPlanState?.({ planDescription: desc });
				} catch {}
			});
			addListener('SetPlanItems', async (items) => {
				if (Array.isArray(items)) {
					globalPlanContext.planItems = items;
					const completedCount = items.filter((it: any) => it?.status === 'done' || it?.status === 'not-needed').length;
					globalPlanContext.progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;
				}
				try {
					const completedCount = Array.isArray(items)
						? items.filter((it: any) => it?.status === 'done' || it?.status === 'not-needed').length
						: 0;
					const progress = Array.isArray(items) && items.length > 0
						? Math.round((completedCount / items.length) * 100)
						: 0;
					await this.session?.setPlanState?.({ planItems: items, progress });
				} catch {}
			});
		} catch {}

		if (trackedState.sessionPath) {
			const items = await this.session.getItems();
			if (items.length > 0) {
				const messages: Message[] = [];
				let id = 0;
				for (const item of items) {
					if (item.type === 'message' && item.role === 'user') {
						messages.push({
							id: id++,
							type: 'user',
							text: item.content as string,
							version: 1,
						});
					} else if (item.type === 'message' && item.role === 'assistant') {
						if (typeof item.content === 'string') {
							messages.push({
								id: id++,
								type: 'agent',
								text: item.content,
								version: 1,
							});
						} else if (Array.isArray(item.content)) {
							for (const part of item.content as any[]) {
								if (part.type === 'text' || part.type === 'output_text') {
									messages.push({
										id: id++,
										type: 'agent',
										text: part.text,
										version: 1,
									});
								} else if (part.type === 'tool_call' || part.type === 'function_call') {
									const args = typeof part.arguments === 'string'
										? part.arguments
										: part.arguments
										? JSON.stringify(part.arguments)
										: '';
									const displayedArgs = args
										? `(${args})`
										: '()';
									messages.push({
										id: id++,
										type: 'tool',
										text: part.name,
										args: displayedArgs,
										version: 1,
									});
								}
							}
						}
					} else if (item.type === 'function_call') {
						const args = typeof item.arguments === 'string'
							? item.arguments
							: item.arguments
							? JSON.stringify(item.arguments)
							: '';
						const displayedArgs = args
							? `(${args})`
							: '()';
						messages.push({
							id: id++,
							type: 'tool',
							text: item.name,
							args: displayedArgs,
							version: 1,
						});
					}
				}
				if (messages.length > 0) {
					this.initialMessages = messages;
				}
			}
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
				// If autonomous and the plan is 100% accomplished, we can exit.
				const planItems = globalPlanContext.planItems;
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

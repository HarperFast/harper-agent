import { Agent, type AgentInputItem, type RunState } from '@openai/agents';
import { emitToListeners } from '../ink/emitters/listener';
import type { Message } from '../ink/models/message';
import { defaultInstructions } from '../lifecycle/defaultInstructions';
import { getModel, isOpenAIModel } from '../lifecycle/getModel';
import { readAgentsMD } from '../lifecycle/readAgentsMD';
import type { CombinedSession } from '../lifecycle/session';
import { trackedState } from '../lifecycle/trackedState';
import { createTools } from '../tools/factory';
import { createSession } from '../utils/sessions/createSession';
import { getModelSettings } from '../utils/sessions/modelSettings';
import { runAgentForOnePass } from './runAgentForOnePass';

export class AgentManager {
	private isInitialized = false;
	private controller: AbortController | null = null;
	private queuedUserInputs: string[] = [];

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
			instructions: readAgentsMD() || defaultInstructions(),
			tools: createTools(),
		});
		this.session = createSession(trackedState.sessionPath);

		if (trackedState.sessionPath) {
			const items = await this.session.getItems();
			if (items.length > 0) {
				const messages: Message[] = [];
				let id = 0;
				for (const item of items as any[]) {
					if (item.type === 'message' && item.role === 'user') {
						messages.push({
							id: id++,
							type: 'user',
							text: item.content,
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
							for (const part of item.content) {
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
	}

	public enqueueUserInput(text: string) {
		if (typeof text === 'string' && text.trim().length > 0) {
			this.queuedUserInputs.push(text);
		}
	}

	public async runTask(task: string) {
		this.controller = new AbortController();

		// We think while the pass executes.
		emitToListeners('SetThinking', true);
		let taskOrState: null | string | AgentInputItem[] | RunState<undefined, Agent> = task;
		while (taskOrState) {
			taskOrState = await runAgentForOnePass(this.agent!, this.session!, taskOrState, this.controller);
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

	public interrupt() {
		if (this.controller) {
			this.controller.abort();
		}
	}
}

export const agentManager = new AgentManager();

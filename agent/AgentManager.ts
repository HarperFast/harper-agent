import { Agent, type AgentInputItem, type RunState } from '@openai/agents';
import { emitToListeners } from '../ink/emitters/listener';
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

	public agent: Agent | null = null;
	public session: CombinedSession | null = null;

	public initialize() {
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

		this.isInitialized = true;
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
	}

	public interrupt() {
		if (this.controller) {
			this.controller.abort();
		}
	}
}

export const agentManager = new AgentManager();

import { tool } from '@openai/agents';
import { statSync } from 'node:fs';
import { z } from 'zod';
import { agentManager } from '../../agent/AgentManager';
import { emitToListeners } from '../../ink/emitters/listener';
import { agentsSkillReference } from '../../lifecycle/agentsSkillReference';
import { readAgentSkillsRoot } from '../../lifecycle/readAgentSkillsRoot';
import { trackedState } from '../../lifecycle/trackedState';
import { resolvePath } from '../../utils/files/paths';

const ToolParameters = z.object({
	path: z
		.string()
		.describe('Directory to switch into. Can be absolute or relative to current workspace.'),
});

export async function execute({ path }: z.infer<typeof ToolParameters>) {
	try {
		const target = resolvePath(trackedState.cwd, path);
		const stat = statSync(target);
		if (!stat.isDirectory()) {
			return `Path is not a directory: ${target}`;
		}
		process.chdir(target);
		trackedState.cwd = process.cwd();

		const agentSkillsRoot = readAgentSkillsRoot();
		if (agentSkillsRoot) {
			if (agentManager.agent) {
				agentManager.agent.instructions = agentSkillsRoot;
			}
			emitToListeners('PushNewMessages', [{
				type: 'agent',
				text: 'Detected agent skills, reading its contents.',
				version: 1,
			}]);
			return `Switched current working directory to ${trackedState.cwd}, with ${agentsSkillReference} file containing:\n${agentSkillsRoot}\nI strongly suggest you use these newfound skills!`;
		}

		return `Switched current working directory to ${trackedState.cwd}`;
	} catch (err: any) {
		return `Failed to change directory: ${err.message}`;
	}
}

export const changeCwdTool = tool({
	name: 'change_cwd',
	description: 'Changes the current working directory for subsequent tools. Accepts absolute or relative paths.',
	parameters: ToolParameters,
	execute,
});

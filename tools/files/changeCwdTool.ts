import { tool } from '@openai/agents';
import { statSync } from 'node:fs';
import { z } from 'zod';
import { agentManager } from '../../agent/AgentManager';
import { readAgentsMD } from '../../lifecycle/readAgentsMD';
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
		// TODO: console.log(`Switched current working directory to ${trackedState.cwd}`);

		const agentsMDContents = readAgentsMD();
		if (agentsMDContents) {
			if (agentManager.agent) {
				agentManager.agent.instructions = agentsMDContents;
			}
			// TODO: console.log('Detected AGENTS.md, reading its contents.');
			return `Switched current working directory to ${trackedState.cwd}, with a AGENTS.md file containing:\n${agentsMDContents}\nI strongly suggest you use these newfound skills!`;
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

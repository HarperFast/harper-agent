import { tool } from '@openai/agents';
import { statSync } from 'node:fs';
import { z } from 'zod';
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
			console.log(`Path is not a directory: ${target}`);
			return `Path is not a directory: ${target}`;
		}
		process.chdir(target);
		trackedState.cwd = process.cwd();
		console.log(`Switched current working directory to ${trackedState.cwd}`);

		const agentsMDContents = readAgentsMD();
		if (agentsMDContents) {
			if (trackedState.agent) {
				trackedState.agent.instructions = agentsMDContents;
			}
			console.log('Detected AGENTS.md, reading its contents for the AI.');
			return `Switched current working directory to ${trackedState.cwd}, with a AGENTS.md file containing:\n${agentsMDContents}\nI strongly suggest you use these newfound skills!`;
		}

		return `Switched current working directory to ${trackedState.cwd}`;
	} catch (err: any) {
		// If path does not exist or cannot be accessed, provide a clear message
		console.log(`Failed to change directory: ${err.message}`);
		return `Failed to change directory: ${err.message}`;
	}
}

export const changeCwdTool = tool({
	name: 'changeCwd',
	description: 'Changes the current working directory for subsequent tools. Accepts absolute or relative paths.',
	parameters: ToolParameters,
	execute,
});

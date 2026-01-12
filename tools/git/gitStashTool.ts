import { tool } from '@openai/agents';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { z } from 'zod';

const execAsync = promisify(exec);

const allowedActions = ['push', 'pop', 'apply', 'list'];

const GitStashParameters = z.object({
	action: z.string().describe('The stash action to perform: ' + allowedActions.join(', ')),
	message: z.string().describe('A message for the stash change.'),
});

export const gitStashTool = tool({
	name: 'gitStashTool',
	description: 'Stash changes or apply a stash.',
	parameters: GitStashParameters,
	async execute({ action, message }: z.infer<typeof GitStashParameters>) {
		try {
			if (!allowedActions.includes(action)) {
				return `Error: Invalid action '${action}'. Allowed actions are: ${allowedActions.join(', ')}`;
			}
			let command = `git stash ${action}`;
			if (action === 'push' && message) {
				command += ` -m "${message.replace(/"/g, '\\"')}"`;
			}
			const { stdout, stderr } = await execAsync(command);
			return `Success: ${stdout || stderr || `Git stash ${action} completed`}`;
		} catch (error: any) {
			return `Error: ${error.stderr || error.message}`;
		}
	},
});

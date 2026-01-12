import { tool } from '@openai/agents';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { z } from 'zod';

const execAsync = promisify(exec);

const GitLogParameters = z.object({
	count: z.number().optional().default(10).describe('Number of commits to show.'),
	oneline: z.boolean().optional().default(true).describe('Whether to show log in oneline format.'),
});

export const gitLogTool = tool({
	name: 'gitLogTool',
	description: 'Show commit logs.',
	parameters: GitLogParameters,
	async execute({ count, oneline }: z.infer<typeof GitLogParameters>) {
		try {
			let command = `git log -n ${count}`;
			if (oneline) {
				command += ' --oneline';
			}
			const { stdout, stderr } = await execAsync(command);
			return stdout || stderr || 'No log output';
		} catch (error: any) {
			return `Error: ${error.stderr || error.message}`;
		}
	},
});

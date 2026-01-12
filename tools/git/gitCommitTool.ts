import { tool } from '@openai/agents';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { z } from 'zod';

const execAsync = promisify(exec);

const GitCommitParameters = z.object({
	message: z.string().describe('The commit message.'),
	addAll: z.boolean().optional().default(false).describe(
		'Whether to add all changes before committing (git commit -am).',
	),
});

export const gitCommitTool = tool({
	name: 'gitCommitTool',
	description: 'Commit changes to the repository.',
	parameters: GitCommitParameters,
	async execute({ message, addAll }: z.infer<typeof GitCommitParameters>) {
		try {
			const command = addAll
				? `git commit -am "${message.replace(/"/g, '\\"')}"`
				: `git commit -m "${message.replace(/"/g, '\\"')}"`;
			const { stdout, stderr } = await execAsync(command);
			return `Success: ${stdout || stderr || 'Changes committed'}`;
		} catch (error: any) {
			return `Error: ${error.stderr || error.message}`;
		}
	},
});

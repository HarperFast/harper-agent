import { tool } from '@openai/agents';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { z } from 'zod';

const execAsync = promisify(exec);

const GitBranchParameters = z.object({
	branchName: z.string().describe('The name of the branch to create or switch to.'),
	create: z.boolean().optional().default(false).describe('Whether to create a new branch.'),
});

export const gitBranchTool = tool({
	name: 'gitBranchTool',
	description: 'Create or switch to a git branch.',
	parameters: GitBranchParameters,
	async execute({ branchName, create }: z.infer<typeof GitBranchParameters>) {
		try {
			const command = create ? `git checkout -b ${branchName}` : `git checkout ${branchName}`;
			const { stdout, stderr } = await execAsync(command);
			return `Success: ${stdout || stderr || `Switched to branch ${branchName}`}`;
		} catch (error: any) {
			return `Error: ${error.stderr || error.message}`;
		}
	},
});

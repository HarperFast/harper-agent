import { tool } from '@openai/agents';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { z } from 'zod';

const execAsync = promisify(exec);

const GitWorkspaceParameters = z.object({
	path: z.string().describe('The path where the new workspace (worktree) should be created.'),
	branchName: z.string().describe('The name of the branch to use in the new workspace.'),
	createBranch: z.boolean().optional().default(false).describe('Whether to create a new branch for this workspace.'),
});

export const gitWorkspaceTool = tool({
	name: 'gitWorkspaceTool',
	description: 'Create a new workspace (git worktree) for parallel work.',
	parameters: GitWorkspaceParameters,
	async execute({ path, branchName, createBranch }: z.infer<typeof GitWorkspaceParameters>) {
		try {
			const command = createBranch
				? `git worktree add -b ${branchName} ${path}`
				: `git worktree add ${path} ${branchName}`;
			const { stdout, stderr } = await execAsync(command);
			return `Success: ${stdout || stderr || `Created workspace at ${path}`}`;
		} catch (error: any) {
			return `Error: ${error.stderr || error.message}`;
		}
	},
});

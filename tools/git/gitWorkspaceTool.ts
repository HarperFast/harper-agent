import { tool } from '@openai/agents';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { z } from 'zod';
import { resolvePath } from '../../utils/files/paths';

const execFileAsync = promisify(execFile);

const GitWorkspaceParameters = z.object({
	path: z.string().describe('The path where the new workspace (worktree) should be created.'),
	branchName: z.string().describe('The name of the branch to use in the new workspace.'),
	createBranch: z.boolean().optional().default(false).describe('Whether to create a new branch for this workspace.'),
});

export const gitWorkspaceTool = tool({
	name: 'gitWorkspaceTool',
	description: 'Create a new workspace (git worktree) for parallel work.',
	parameters: GitWorkspaceParameters,
	async execute({ path: workspacePath, branchName, createBranch }: z.infer<typeof GitWorkspaceParameters>) {
		try {
			const resolvedPath = resolvePath(process.cwd(), workspacePath);
			const args = createBranch
				? ['worktree', 'add', '-b', branchName, resolvedPath]
				: ['worktree', 'add', resolvedPath, branchName];
			const { stdout, stderr } = await execFileAsync('git', args);
			return `Success: ${stdout || stderr || `Created workspace at ${resolvedPath}`}`;
		} catch (error: any) {
			return `Error: ${error.stderr || error.message}`;
		}
	},
});

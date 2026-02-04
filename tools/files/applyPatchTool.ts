import { type RunContext, tool } from '@openai/agents';
import chalk from 'chalk';
import { z } from 'zod';
import { trackedState } from '../../lifecycle/trackedState';
import { printDiff } from '../../utils/files/printDiff';
import { spinner } from '../../utils/shell/spinner';
import { WorkspaceEditor } from './workspaceEditor';

const ApplyPatchParameters = z.object({
	type: z.enum(['create_file', 'update_file', 'delete_file']).describe('The type of operation to perform.'),
	path: z.string().describe('The path to the file to operate on.'),
	diff: z.string().optional().default('').describe(
		'The diff to apply. For create_file, every line must start with "+". For update_file, use a headerless unified diff format (start sections with "@@", and use "+", "-", or " " for lines). Do not include markers like "*** Begin Patch" or "*** Add File:".',
	),
});

export function createApplyPatchTool() {
	const editor = new WorkspaceEditor(() => trackedState.cwd);

	return tool({
		name: 'apply_patch',
		description: 'Applies a patch (create, update, or delete a file) to the workspace.',
		parameters: ApplyPatchParameters,
		needsApproval: async (runContext: RunContext, operation: z.infer<typeof ApplyPatchParameters>, callId?: string) => {
			try {
				if (callId && runContext.isToolApproved({ toolName: 'apply_patch', callId })) {
					return false;
				}

				const autoApproved = process.env.APPLY_PATCH_AUTO_APPROVE === '1';

				spinner.stop();
				if (autoApproved) {
					console.log(`\n${chalk.bold.bgGreen.black(' Apply patch (auto-approved): ')}`);
				} else {
					console.log(`\n${chalk.bold.bgYellow.black(' Apply patch approval required: ')}`);
				}
				console.log(`${chalk.bold(operation.type)}: ${operation.path}`);
				if (operation.diff) {
					printDiff(operation.diff);
				}
				if (autoApproved) {
					spinner.start();
				}

				return !autoApproved;
			} catch (err) {
				console.error('apply_patch approval step failed:', err);
				return false;
			}
		},
		execute: async (operation) => {
			try {
				switch (operation.type) {
					case 'create_file':
						if (!operation.diff) {
							return { status: 'failed', output: 'Error: diff is required for create_file' } as const;
						}
						return await editor.createFile(operation as any);
					case 'update_file':
						if (!operation.diff) {
							return { status: 'failed', output: 'Error: diff is required for update_file' } as const;
						}
						return await editor.updateFile(operation as any);
					case 'delete_file':
						return await editor.deleteFile(operation as any);
					default:
						return { status: 'failed', output: `Error: Unknown operation type: ${(operation as any).type}` } as const;
				}
			} catch (err) {
				console.error('hit unexpected error in apply patch tool', err);
				// Ensure the tool always returns something the LLM can react to
				return { status: 'failed', output: `apply_patch threw: ${String(err)}` } as const;
			}
		},
	});
}

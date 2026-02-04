import { tool } from '@openai/agents';
import chalk from 'chalk';
import { z } from 'zod';
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

export function createApplyPatchTool(shouldNormalize: boolean = true) {
	const editor = new WorkspaceEditor(process.cwd(), shouldNormalize);
	return tool({
		name: 'apply_patch',
		description: 'Applies a patch (create, update, or delete a file) to the workspace.',
		parameters: ApplyPatchParameters,
		execute: async (operation) => {
			switch (operation.type) {
				case 'create_file':
					if (!operation.diff) {
						return 'Error: diff is required for create_file';
					}
					return editor.createFile(operation as any);
				case 'update_file':
					if (!operation.diff) {
						return 'Error: diff is required for update_file';
					}
					return editor.updateFile(operation as any);
				case 'delete_file':
					return editor.deleteFile(operation as any);
				default:
					return `Error: Unknown operation type: ${(operation as any).type}`;
			}
		},
		needsApproval: async (runContext, operation, callId) => {
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
		},
	});
}

import {applyPatchTool} from '@openai/agents';
import {promptApplyPatchApproval} from '../../utils/promptApplyPatchApproval.ts';
import {WorkspaceEditor} from './workspaceEditor.ts';

export function createApplyPatchTool() {
	return applyPatchTool({
		editor: new WorkspaceEditor(process.cwd()),
		// could also be a function for you to determine if approval is needed
		needsApproval: true,
		onApproval: async (_ctx, approvalItem) => {
			const op =
				approvalItem.rawItem.type === 'apply_patch_call'
					? approvalItem.rawItem.operation
					: undefined;
			const approve = op ? await promptApplyPatchApproval(op) : false;
			return {approve};
		},
	});
}

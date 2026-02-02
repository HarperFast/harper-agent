import { tool } from '@openai/agents';
import { z } from 'zod';
import { updateEnv } from '../../utils/files/updateEnv';

const SetPatchAutoApproveParameters = z.object({
	autoApprove: z.boolean(),
});

export const setPatchAutoApproveTool = tool({
	name: 'setPatchAutoApproveTool',
	description:
		'Enable or disable automatic approval for patch commands by setting APPLY_PATCH_AUTO_APPROVE=1 or 0 in .env and current process.',
	parameters: SetPatchAutoApproveParameters,
	needsApproval: async (_runContext, { autoApprove }) => {
		const newValue = autoApprove ? '1' : '0';
		return process.env.APPLY_PATCH_AUTO_APPROVE !== newValue;
	},
	async execute({ autoApprove }: z.infer<typeof SetPatchAutoApproveParameters>) {
		const newValue = autoApprove ? '1' : '0';
		if (process.env.APPLY_PATCH_AUTO_APPROVE === newValue) {
			return `APPLY_PATCH_AUTO_APPROVE is already set to ${newValue} in the current process.`;
		}

		try {
			await updateEnv('APPLY_PATCH_AUTO_APPROVE', newValue);
			return `APPLY_PATCH_AUTO_APPROVE has been set to ${newValue} in .env and current process.`;
		} catch (error: any) {
			return `Error updating .env file: ${error.message}`;
		}
	},
});

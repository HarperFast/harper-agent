import { tool } from '@openai/agents';
import { z } from 'zod';
import { emitToListeners } from '../../ink/emitters/listener';
import { trackedState } from '../../lifecycle/trackedState';
import { updateEnv } from '../../utils/files/updateEnv';
import { getEnv } from '../../utils/getEnv';

const SetPatchAutoApproveParameters = z.object({
	autoApprove: z.boolean(),
});

export const setPatchAutoApproveTool = tool({
	name: 'set_patch_auto_approve',
	description:
		'Enable or disable automatic approval for patch commands by setting HARPER_AGENT_AUTO_APPROVE_PATCHES=1 or 0 in .env and current process.',
	parameters: SetPatchAutoApproveParameters,
	needsApproval: async (_runContext, { autoApprove }) => {
		const newValue = autoApprove ? '1' : '0';
		return getEnv('HARPER_AGENT_AUTO_APPROVE_PATCHES', 'APPLY_PATCH_AUTO_APPROVE') !== newValue;
	},
	async execute({ autoApprove }: z.infer<typeof SetPatchAutoApproveParameters>) {
		const newValue = autoApprove ? '1' : '0';
		if (getEnv('HARPER_AGENT_AUTO_APPROVE_PATCHES', 'APPLY_PATCH_AUTO_APPROVE') === newValue) {
			return `HARPER_AGENT_AUTO_APPROVE_PATCHES is already set to ${newValue}.`;
		}

		try {
			updateEnv('HARPER_AGENT_AUTO_APPROVE_PATCHES', newValue);
			// Update tracked state so Settings pane reflects immediately
			trackedState.autoApprovePatches = autoApprove;
			emitToListeners('SettingsUpdated', undefined);
			return `HARPER_AGENT_AUTO_APPROVE_PATCHES has been set to ${newValue} in .env and current process.`;
		} catch (error: any) {
			return `Error updating .env file: ${error.message}`;
		}
	},
});

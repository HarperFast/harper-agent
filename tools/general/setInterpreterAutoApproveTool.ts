import { tool } from '@openai/agents';
import { z } from 'zod';
import { emitToListeners } from '../../ink/emitters/listener';
import { trackedState } from '../../lifecycle/trackedState';
import { updateEnv } from '../../utils/files/updateEnv';
import { getEnv } from '../../utils/getEnv';

const SetInterpreterAutoApproveParameters = z.object({
	autoApprove: z.boolean(),
});

export const setInterpreterAutoApproveTool = tool({
	name: 'set_interpreter_auto_approve',
	description:
		'Enable or disable automatic approval for code interpreter by setting HARPER_AGENT_AUTO_APPROVE_CODE_INTERPRETER=1 or 0 in .env and current process.',
	parameters: SetInterpreterAutoApproveParameters,
	needsApproval: async (_runContext, { autoApprove }) => {
		const newValue = autoApprove ? '1' : '0';
		return getEnv('HARPER_AGENT_AUTO_APPROVE_CODE_INTERPRETER', 'CODE_INTERPRETER_AUTO_APPROVE') !== newValue;
	},
	async execute({ autoApprove }: z.infer<typeof SetInterpreterAutoApproveParameters>) {
		const newValue = autoApprove ? '1' : '0';
		if (getEnv('HARPER_AGENT_AUTO_APPROVE_CODE_INTERPRETER', 'CODE_INTERPRETER_AUTO_APPROVE') === newValue) {
			return `HARPER_AGENT_AUTO_APPROVE_CODE_INTERPRETER is already set to ${newValue}.`;
		}

		try {
			updateEnv('HARPER_AGENT_AUTO_APPROVE_CODE_INTERPRETER', newValue);
			// Update tracked state so Settings pane reflects immediately
			trackedState.autoApproveCodeInterpreter = autoApprove;
			emitToListeners('SettingsUpdated', undefined);
			return `HARPER_AGENT_AUTO_APPROVE_CODE_INTERPRETER has been set to ${newValue} in .env and current process.`;
		} catch (error: any) {
			return `Error updating .env file: ${error.message}`;
		}
	},
});

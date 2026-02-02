import { tool } from '@openai/agents';
import { z } from 'zod';
import { updateEnv } from '../../utils/files/updateEnv';

const SetInterpreterAutoApproveParameters = z.object({
	autoApprove: z.boolean(),
});

export const setInterpreterAutoApproveTool = tool({
	name: 'setInterpreterAutoApproveTool',
	description:
		'Enable or disable automatic approval for code interpreter by setting CODE_INTERPRETER_AUTO_APPROVE=1 or 0 in .env and current process.',
	parameters: SetInterpreterAutoApproveParameters,
	needsApproval: async (_runContext, { autoApprove }) => {
		const newValue = autoApprove ? '1' : '0';
		return process.env.CODE_INTERPRETER_AUTO_APPROVE !== newValue;
	},
	async execute({ autoApprove }: z.infer<typeof SetInterpreterAutoApproveParameters>) {
		const newValue = autoApprove ? '1' : '0';
		if (process.env.CODE_INTERPRETER_AUTO_APPROVE === newValue) {
			return `CODE_INTERPRETER_AUTO_APPROVE is already set to ${newValue} in the current process.`;
		}

		try {
			await updateEnv('CODE_INTERPRETER_AUTO_APPROVE', newValue);
			return `CODE_INTERPRETER_AUTO_APPROVE has been set to ${newValue} in .env and current process.`;
		} catch (error: any) {
			return `Error updating .env file: ${error.message}`;
		}
	},
});

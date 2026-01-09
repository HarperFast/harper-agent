import {tool} from '@openai/agents';
import {z} from 'zod';
import {harperProcess} from '../../utils/harperProcess.ts';

const ToolParameters = z.object({});

export const readHarperLogsTool = tool({
	name: 'readHarperLogsTool',
	description: 'Reads the most recent console logs of a started Harper app.',
	parameters: ToolParameters,
	async execute({}: z.infer<typeof ToolParameters>) {
		if (!harperProcess.running) {
			return `Error: No Harper application is currently running.`;
		}

		try {
			const logs = harperProcess.getAndClearLogs();
			return logs || 'No logs available yet.';
		} catch (error) {
			return `Error reading Harper application logs: ${error}`;
		}
	},
});

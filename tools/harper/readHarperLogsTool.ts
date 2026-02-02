import { tool } from '@openai/agents';
import { z } from 'zod';
import { harperProcess } from '../../utils/shell/harperProcess';

const ToolParameters = z.object({});

export const readHarperLogsTool = tool({
	name: 'readHarperLogsTool',
	description:
		'Reads the most recent console logs of a started Harper app and clears them so that subsequent reads will only show new logs.',
	parameters: ToolParameters,
	async execute() {
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

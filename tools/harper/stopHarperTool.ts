import { tool } from '@openai/agents';
import { z } from 'zod';
import { harperProcess } from '../../utils/shell/harperProcess';

const ToolParameters = z.object({});

export const stopHarperTool = tool({
	name: 'stopHarperTool',
	description: 'Stops all previously started Harper app background process.',
	parameters: ToolParameters,
	async execute() {
		if (!harperProcess.running) {
			return `Error: No Harper application is currently running.`;
		}

		try {
			harperProcess.stop();
			return `Successfully stopped Harper application.`;
		} catch (error) {
			return `Error stopping Harper application: ${error}`;
		}
	},
});

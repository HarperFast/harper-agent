import { tool } from '@openai/agents';
import { z } from 'zod';
import { isIgnored } from '../../utils/aiignore.ts';
import { harperProcess } from '../../utils/harperProcess.ts';
import { sleep } from '../../utils/sleep.ts';

const ToolParameters = z.object({
	directoryName: z
		.string()
		.describe('The name of the directory that the Harper app is in.'),
});

export const startHarperTool = tool({
	name: 'startHarperTool',
	description:
		'Starts a Harper app background process, allowing you to observe the app in action (by readHarperLogsTool, hitHarperAPITool, openHarperInBrowserTool, etc).',
	parameters: ToolParameters,
	async execute({ directoryName }: z.infer<typeof ToolParameters>) {
		if (isIgnored(directoryName)) {
			return `Error: Target directory ${directoryName} is restricted by .aiignore`;
		}

		if (harperProcess.running) {
			return `Error: A Harper application is already running. Please stop it before starting a new one.`;
		}

		try {
			harperProcess.start(directoryName);
			await sleep(5000);
			const logs = harperProcess.getAndClearLogs();
			return `Successfully started Harper application in '${directoryName}' with initial logs:\n${logs}`;
		} catch (error) {
			return `Error starting Harper application: ${error}`;
		}
	},
});

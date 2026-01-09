import {tool} from '@openai/agents';
import {spawn} from 'node:child_process';
import {platform} from 'node:os';
import {z} from 'zod';

const ToolParameters = z.object({
	url: z
		.string()
		.describe('The starting URL of the browser (i.e. http://localhost:9926)'),
});

export const openBrowserTool = tool({
	name: 'openBrowserTool',
	description: 'Opens the requested URL in the user\'s browser.',
	parameters: ToolParameters,
	async execute({ url }: z.infer<typeof ToolParameters>) {
		try {
			const p = platform();
			if (p === 'darwin') {
				spawn('open', [url]);
			} else if (p === 'win32') {
				spawn('start', ['', url], { shell: true });
			} else {
				spawn('xdg-open', [url]);
			}
			return `Successfully opened '${url}' in the browser.`;
		} catch (error) {
			return `Error opening browser: ${error}`;
		}
	},
});

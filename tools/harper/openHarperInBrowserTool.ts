import { tool } from '@openai/agents';
import { spawn } from 'node:child_process';
import { platform } from 'node:os';
import { z } from 'zod';
import { harperProcess } from '../../utils/shell/harperProcess';

let alreadyOpened = false;

const ToolParameters = z.object({});

export const openHarperInBrowserTool = tool({
	name: 'openHarperInBrowserTool',
	description: "Opens the running Harper app in the user's browser.",
	parameters: ToolParameters,
	async execute() {
		try {
			if (alreadyOpened) {
				return `Browser is already open.`;
			}
			if (!harperProcess.running) {
				return `Error: No Harper application is currently running.`;
			}
			const url = `http://localhost:${harperProcess.httpPort}/`;
			const p = platform();
			if (p === 'darwin') {
				spawn('open', [url]);
			} else if (p === 'win32') {
				spawn('start', ['', url]);
			} else {
				spawn('xdg-open', [url]);
			}
			alreadyOpened = true;
			return `Successfully opened '${url}' in the browser.`;
		} catch (error) {
			return `Error opening browser: ${error}`;
		}
	},
});

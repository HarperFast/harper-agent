import { tool } from '@openai/agents';
import { z } from 'zod';
import { harperProcess } from '../../utils/harperProcess.ts';

const ToolParameters = z.object({});

export const readHarperOpenAPISpecTool = tool({
	name: 'readHarperOpenAPISpecTool',
	description: 'Reads the OpenAPI spec of a started Harper app.',
	parameters: ToolParameters,
	async execute() {
		try {
			if (!harperProcess.running) {
				return `Error: No Harper application is currently running.`;
			}
			const response = await fetch(`http://localhost:${harperProcess.httpPort}/openapi`);
			if (!response.ok) {
				return `Error: Failed to download OpenAPI specs: ${response.statusText} (${response.status})`;
			}
			return await response.text();
		} catch (error) {
			return `Error getting OpenAPI spec from Harper app: ${error}`;
		}
	},
});

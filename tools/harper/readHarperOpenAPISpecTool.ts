import {tool} from '@openai/agents';
import {z} from 'zod';
import {harperProcess} from '../../utils/harperProcess.ts';

const ToolParameters = z.object({});

export const readHarperOpenAPISpecTool = tool({
	name: 'readHarperOpenAPISpecTool',
	description:
		'Reads the OpenAPI spec of a started Harper app.',
	parameters: ToolParameters,
	async execute({}: z.infer<typeof ToolParameters>) {
		try {
			if (!harperProcess.running) {
				return `Error: No Harper application is currently running.`;
			}

			// TODO: Auth...
			// TODO: Figure out port.
			const response = await fetch('http://localhost:9962/openapi/');
			if (!response.ok) {
				return `Error: Failed to download template: ${response.statusText} (${response.status})`;
			}
			return await response.text();
			// TODO: If not started, return an error string.
		} catch (error) {
			return `Error getting OpenAPI spec from Harper app: ${error}`;
		}
	},
});

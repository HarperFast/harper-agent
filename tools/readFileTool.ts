import {tool} from '@openai/agents';
import {readFile} from 'node:fs/promises';
import {z} from 'zod';
import {isIgnored} from '../utils/aiignore.ts';

const ToolParameters = z.object({
	fileName: z
		.string()
		.describe('The name of the file to read.'),
});

export const readFileTool = tool({
	name: 'readFile',
	description:
		'Reads the contents of a specified file.',
	parameters: ToolParameters,
	async execute({fileName}: z.infer<typeof ToolParameters>) {
		if (isIgnored(fileName)) {
			return `Error: Access to ${fileName} is restricted by .aiignore`;
		}
		try {
			return readFile(fileName, 'utf-8');
		} catch (error) {
			return `Error reading file: ${error}`;
		}
	},
});

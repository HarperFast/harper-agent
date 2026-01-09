import {tool} from '@openai/agents';
import {readdir} from 'node:fs/promises';
import {z} from 'zod';
import path from 'node:path';
import {isIgnored} from '../../utils/aiignore.ts';

const ToolParameters = z.object({
	directoryName: z
		.string()
		.describe('The name of the directory to read.'),
});

export const readDirTool = tool({
	name: 'readDir',
	description:
		'Lists the files in a directory.',
	parameters: ToolParameters,
	async execute({directoryName}: z.infer<typeof ToolParameters>) {
		try {
			const files = await readdir(directoryName, 'utf-8');
			return files.filter(file => !isIgnored(path.join(directoryName, file)));
		} catch (error) {
			return `Error reading directory: ${error}`;
		}
	},
});

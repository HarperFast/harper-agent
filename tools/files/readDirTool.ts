import { tool } from '@openai/agents';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { trackedState } from '../../lifecycle/trackedState';
import { isIgnored } from '../../utils/files/aiignore';
import { resolvePath } from '../../utils/files/paths';

const ToolParameters = z.object({
	directoryName: z
		.string()
		.describe('The name of the directory to read.'),
});

export const readDirTool = tool({
	name: 'readDir',
	description: 'Lists the files in a directory.',
	parameters: ToolParameters,
	async execute({ directoryName }: z.infer<typeof ToolParameters>) {
		try {
			const resolvedPath = resolvePath(trackedState.cwd, directoryName);
			const files = await readdir(resolvedPath, 'utf8');
			return files.filter(file => !isIgnored(path.join(resolvedPath, file)));
		} catch (error) {
			return `Error reading directory: ${error}`;
		}
	},
});

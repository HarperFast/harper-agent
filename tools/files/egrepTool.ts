import { tool } from '@openai/agents';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { z } from 'zod';
import { isIgnored } from '../../utils/files/aiignore';
import { resolvePath } from '../../utils/files/paths';

const execFileAsync = promisify(execFile);

const ToolParameters = z.object({
	path: z.string()
		.describe('The path to start the search from.'),
	pattern: z
		.string()
		.describe('The pattern to search'),
});

export const egrepTool = tool({
	name: 'egrep',
	description: 'File pattern searcher.',
	parameters: ToolParameters,
	async execute({ path: searchPath, pattern }: z.infer<typeof ToolParameters>) {
		try {
			const resolvedPath = resolvePath(process.cwd(), searchPath);
			const { stdout } = await execFileAsync('grep', ['-Eir', pattern, resolvedPath]);
			return stdout
				.split('\n')
				.filter(line => {
					if (line.trim() === '') { return false; }
					// grep output format is typically path:line_content
					const colonIndex = line.indexOf(':');
					if (colonIndex !== -1) {
						const filePath = line.substring(0, colonIndex);
						return !isIgnored(filePath);
					}
					return true;
				})
				.join('\n');
		} catch (error: any) {
			// grep returns exit code 1 if no matches found, which is treated as an error by execFile
			if (error.code === 1) {
				return '';
			}
			return `Error executing egrep command: ${error.stderr || error.message}`;
		}
	},
});

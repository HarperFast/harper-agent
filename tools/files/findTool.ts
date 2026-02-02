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
	iname: z
		.string()
		.describe(
			'Case insensitive, true if the last component of the pathname being examined matches pattern.  Special shell pattern matching characters (“[”, “]”, “*”, and “?”) may be used as part of pattern.  These characters may be matched explicitly by escaping them with a backslash (“\\”).',
		),
});

export const findTool = tool({
	name: 'find',
	description: 'Walk a file hierarchy.',
	parameters: ToolParameters,
	async execute({ path: searchPath, iname }: z.infer<typeof ToolParameters>) {
		try {
			const resolvedPath = resolvePath(process.cwd(), searchPath);
			const { stdout } = await execFileAsync('find', [resolvedPath, '-iname', iname]);
			return stdout
				.split('\n')
				.filter(line => line.trim() !== '' && !isIgnored(line))
				.join('\n');
		} catch (error: any) {
			return `Error executing find command: ${error.stderr || error.message}`;
		}
	},
});

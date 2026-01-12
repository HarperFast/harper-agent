import { tool } from '@openai/agents';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { z } from 'zod';

const execAsync = promisify(exec);

const GitAddParameters = z.object({
	files: z.array(z.string()).describe('The files to add. If not provided, all changes will be added.'),
});

export const gitAddTool = tool({
	name: 'gitAddTool',
	description: 'Add file contents to the index.',
	parameters: GitAddParameters,
	async execute({ files }: z.infer<typeof GitAddParameters>) {
		try {
			let command = 'git add';
			if (!files || files.length === 0) {
				command += ' .';
			} else {
				command += ` ${files.join(' ')}`;
			}
			const { stdout, stderr } = await execAsync(command);
			return `Success: ${stdout || stderr || 'Files added to index'}`;
		} catch (error: any) {
			return `Error: ${error.stderr || error.message}`;
		}
	},
});

import { tool } from '@openai/agents';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { z } from 'zod';
import { resolvePath } from '../../utils/files/paths';

const ToolParameters = z.object({
	directoryName: z
		.string()
		.describe('The name of the directory to create the application in.'),
	template: z
		.enum(['vanilla-ts', 'vanilla', 'react-ts', 'react'])
		.optional()
		.describe('The template to use for the new application. Defaults to vanilla-ts.')
		.default('vanilla-ts'),
});

export async function execute({ directoryName, template }: z.infer<typeof ToolParameters>) {
	const resolvedPath = resolvePath(process.cwd(), directoryName);

	const currentCwd = process.cwd();
	const isCurrentDir = resolvedPath === currentCwd;
	const executionCwd = isCurrentDir ? resolvedPath : path.dirname(resolvedPath);
	const appName = isCurrentDir ? '.' : path.basename(resolvedPath);

	try {
		console.log(`Creating new Harper application in ${resolvedPath} using template ${template}...`);
		console.log(`Executing npm create harper in ${executionCwd} for ${appName}`);

		// Redirect stderr to stdout to capture everything in the output
		const command = `npm create harper@latest --yes "${appName}" -- --no-interactive --template ${template} 2>&1`;
		const output = execSync(command, {
			cwd: executionCwd,
			encoding: 'utf-8',
		});

		console.log(`Initializing new Git repository in ${resolvedPath}...`);
		execSync('git init', { cwd: resolvedPath, stdio: 'ignore' });

		return `Successfully created new Harper application in '${resolvedPath}' using template '${template}'.\n\nCommand Output:\n${output}\n\nInitialized Git repository.`;
	} catch (error: any) {
		let errorMsg = `Error creating new Harper application: ${error.message}`;
		if (error.stdout) {
			errorMsg += `\n\nCommand Output:\n${error.stdout}`;
		}
		return errorMsg;
	}
}

export const createNewHarperApplicationTool = tool({
	name: 'createNewHarperApplicationTool',
	description: 'Creates a new Harper application using npm create harper.',
	parameters: ToolParameters,
	execute,
});

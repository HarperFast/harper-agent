import { tool } from '@openai/agents';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { z } from 'zod';
import { trackedState } from '../../lifecycle/trackedState';
import { resolvePath } from '../../utils/files/paths';
import { buildCreateCommand } from '../../utils/package/buildHarperCreateCommand';
import { pickPreferredPackageManager, PM_DISPLAY } from '../../utils/package/pickPreferredPackageManager';
import { execute as changeCwd } from '../files/changeCwdTool';

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
	const currentCwd = trackedState.cwd;
	const resolvedPath = resolvePath(currentCwd, directoryName);
	const isCurrentDir = resolvedPath === currentCwd;
	const executionCwd = isCurrentDir ? resolvedPath : path.dirname(resolvedPath);
	const appName = isCurrentDir ? '.' : path.basename(resolvedPath);

	try {
		// TODO: console.log(`Creating new Harper application in ${resolvedPath} using template ${template}...`);

		const pm = pickPreferredPackageManager();
		const { cmd, label } = buildCreateCommand(pm, appName, template);
		// TODO: console.log(`Detected ${PM_DISPLAY[pm]}. Executing: ${label} in ${executionCwd} for ${appName}`);
		execSync(cmd, {
			cwd: executionCwd,
			encoding: 'utf8',
		});

		// TODO: console.log(`Initializing new Git repository in ${resolvedPath}...`);
		execSync('git init', { cwd: resolvedPath, stdio: 'ignore' });

		// Automatically switch into the newly created app directory
		const switchedDir = await changeCwd({ path: resolvedPath } as any);

		return `Successfully created a new Harper application in '${resolvedPath}' using template '${template}' with a matching Git repository initialized.  Use the readDir and readFile tools to inspect the contents of the application. ${switchedDir}.`;
	} catch (error: any) {
		let errorMsg = `Error creating new Harper application: ${error.message}`;
		if (error.stdout) {
			errorMsg += `\n\nCommand Output:\n${error.stdout}`;
		}
		return errorMsg;
	}
}

export const createNewHarperApplicationTool = tool({
	name: 'create_new_harper_application',
	description:
		'Creates a new Harper application using the best available package manager (yarn/pnpm/bun/deno, falling back to npm).',
	parameters: ToolParameters,
	execute,
});

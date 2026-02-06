import { tool } from '@openai/agents';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
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
		console.log(`Creating new Harper application in ${resolvedPath} using template ${template}...`);

		const pm = pickPreferredPackageManager();
		const { cmd, label } = buildCreateCommand(pm, appName, template);
		console.log(`Detected ${PM_DISPLAY[pm]}. Executing: ${label} in ${executionCwd} for ${appName}`);
		execSync(cmd, {
			cwd: executionCwd,
			encoding: 'utf8',
		});

		console.log(`Initializing new Git repository in ${resolvedPath}...`);
		execSync('git init', { cwd: resolvedPath, stdio: 'ignore' });

		// Automatically switch into the newly created app directory
		const switchedDir = await changeCwd({ path: resolvedPath } as any);

		const agentsMdExists = existsSync(path.join(resolvedPath, 'AGENTS.md'));
		let returnMsg =
			`Successfully created a new Harper application in '${resolvedPath}' using template '${template}' with a matching Git repository initialized. ${switchedDir}.`;

		if (agentsMdExists) {
			returnMsg +=
				` I found an AGENTS.md file in the new application – I strongly suggest you read it next to understand how to use your new skills!`;
		}
		returnMsg += ` Use the readDir and readFile tools to inspect the contents of the application.`;

		return returnMsg;
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
	description:
		'Creates a new Harper application using the best available package manager (yarn/pnpm/bun/deno, falling back to npm).',
	parameters: ToolParameters,
	execute,
});

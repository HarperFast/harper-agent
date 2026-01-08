import {tool} from '@openai/agents';
import {execSync} from 'node:child_process';
import {z} from 'zod';
import fs from 'node:fs';
import {applyTemplateToDirectory} from '../utils/applyTemplateToDirectory.ts';
import {isIgnored} from '../utils/aiignore.ts';

const ToolParameters = z.object({
	directoryName: z
		.string()
		.describe('The name of the directory to download the template into.'),
});

export const createNewHarperApplicationTool = tool({
	name: 'createNewHarperApplicationTool',
	description:
		'Creates a new harper application by downloading the application template zip archive.',
	parameters: ToolParameters,
	async execute({directoryName}: z.infer<typeof ToolParameters>) {
		if (isIgnored(directoryName)) {
			return `Error: Target directory ${directoryName} is restricted by .aiignore`;
		}
		try {
			if (!fs.existsSync(directoryName)) {
				fs.mkdirSync(directoryName, {recursive: true});
			}

			const error = await applyTemplateToDirectory(directoryName);
			if (error) {
				return error;
			}

			console.log(`Initializing new Git repository...`);
			execSync('git init', {cwd: directoryName, stdio: 'ignore'});

			return `Successfully created new Harper application in '${directoryName}' and initialized Git repository.`;
		} catch (error) {
			return `Error creating new Harper application: ${error}`;
		}
	},
});

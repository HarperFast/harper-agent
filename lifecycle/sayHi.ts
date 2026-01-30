import chalk from 'chalk';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { harperResponse } from '../utils/harperResponse';

export function sayHi() {
	const workspaceRoot = process.cwd();
	const harperAppExists = existsSync(join(workspaceRoot, 'config.yaml'));
	const vibing = harperAppExists ? 'updating' : 'creating';
	const instructions = `You are working on ${vibing} the harper app in ${workspaceRoot} with the user.`;

	console.log(chalk.dim(`Working directory: ${chalk.cyan(workspaceRoot)}`));
	console.log(chalk.dim(`Harper app detected: ${chalk.cyan(harperAppExists ? 'Yes' : 'No')}`));
	console.log(chalk.dim(`Press Ctrl+C or hit enter twice to exit.\n`));

	harperResponse(
		harperAppExists
			? 'What do you want to do together today?'
			: 'What kind of Harper app do you want to make together?',
	);
	return {
		name: 'Harper App Development Assistant',
		instructions,
	};
}

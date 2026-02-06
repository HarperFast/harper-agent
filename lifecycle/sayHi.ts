import chalk from 'chalk';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { harperResponse } from '../utils/shell/harperResponse';
import { trackedState } from './trackedState';

export function sayHi() {
	const harperAppExists = existsSync(join(trackedState.cwd, 'config.yaml'));

	console.log(chalk.dim(`Working directory: ${chalk.cyan(trackedState.cwd)}`));
	console.log(chalk.dim(`Harper app detected: ${chalk.cyan(harperAppExists ? 'Yes' : 'No')}`));
	console.log(chalk.dim(`Press Ctrl+C or hit enter twice to exit.\n`));

	harperResponse(
		harperAppExists
			? 'What do you want to do together today?'
			: 'What kind of Harper app do you want to make together?',
	);
}

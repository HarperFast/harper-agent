import chalk from 'chalk';

export function harperResponse(text: string | undefined) {
	if (text) {
		console.log(`${chalk.bold('Harper:')} ${chalk.cyan(text)}\n`);
	}
}

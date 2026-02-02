import chalk from 'chalk';

export function printDiff(diff: string) {
	const lines = diff.split('\n');
	for (const line of lines) {
		if (line.startsWith('+')) {
			console.log(chalk.green(line));
		} else if (line.startsWith('-')) {
			console.log(chalk.red(line));
		} else {
			console.log(chalk.dim(line));
		}
	}
}

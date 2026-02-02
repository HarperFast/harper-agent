import chalk from 'chalk';
import { getOwnPackageJson } from '../package/getOwnPackageJson';

/**
 * Checks if the provided arguments contain a help request.
 */
export function isHelpRequest(args: string[]): boolean {
	const helpVariants = ['--help', '-h', 'help'];
	return args.some((arg) => helpVariants.includes(arg.toLowerCase()));
}

/**
 * Checks if the provided arguments contain a version request.
 */
export function isVersionRequest(args: string[]): boolean {
	const versionVariants = ['--version', '-v', 'version'];
	return args.some((arg) => versionVariants.includes(arg.toLowerCase()));
}

/**
 * Prints the help information and exits.
 */
export function handleHelp(): void {
	console.log(`
${chalk.bold('hairper')} - AI to help you with Harper app management

${chalk.bold('USAGE')}
  $ hairper [options]
  $ hairper [command]

${chalk.bold('OPTIONS')}
  -h, --help              Show help information
  -v, --version           Show version information
  -m, --model             Specify the model to use (e.g., gpt-4o, claude-3-5-sonnet, ollama-llama3)
                          Can also be set via HAIRPER_MODEL environment variable.
                          For Ollama, use the ollama- prefix (e.g., ollama-llama3).
  -c, --compaction-model  Specify the compaction model to use (defaults to gpt-4o-mini).
                          Can also be set via HAIRPER_COMPACTION_MODEL environment variable.
  -s, --session           Specify a path to a SQLite database file to persist the chat session.
                          Can also be set via HAIRPER_SESSION environment variable.

${chalk.bold('COMMANDS')}
  help           Show help information
  version        Show version information

${chalk.bold('EXAMPLES')}
  $ hairper --help
  $ hairper version
  $ hairper "create a new harper app"
`);
	process.exit(0);
}

/**
 * Prints the version and exits.
 */
export function handleVersion(): void {
	const pkg = getOwnPackageJson();
	console.log(pkg.version);
	process.exit(0);
}

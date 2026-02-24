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
${chalk.bold('harper-agent')} - AI to help you with Harper app management

${chalk.bold('USAGE')}
  $ harper-agent [options]
  $ harper-agent [command]

${chalk.bold('OPTIONS')}
  -h, --help              Show help information
  -v, --version           Show version information
  -m, --model             Specify the model to use (e.g., gpt-5.2, claude-3-5-sonnet, ollama-llama3)
                          Can also be set via HARPER_AGENT_MODEL environment variable.
                          For Ollama, use the ollama- prefix (e.g., ollama-llama3).
  -c, --compaction-model  Specify the compaction model to use (defaults to gpt-5-nano).
                          Can also be set via HARPER_AGENT_COMPACTION_MODEL environment variable.
  -s, --session           Specify a path to a SQLite database file to persist the chat session.
                          Can also be set via HARPER_AGENT_SESSION environment variable.
  --max-turns             Specify the maximum number of turns for the agent run.
                          In task-driven mode, this defaults to unlimited.
                          Can also be set via HARPER_AGENT_MAX_TURNS environment variable.
  --max-cost              Specify the maximum cost (in USD) for the agent run.
                          If exceeded, the agent will exit with a non-zero code.
                          Can also be set via HARPER_AGENT_MAX_COST environment variable.
  --flex-tier             Force the use of the flex service tier for lower costs but potentially 
                          more errors under high system load.
                          Can also be set via HARPER_AGENT_FLEX_TIER=true environment variable.

${chalk.bold('COMMANDS')}
  --help           Show help information
  --version        Show version information

${chalk.bold('EXAMPLES')}
  $ harper-agent --help
  $ harper-agent --version
  $ harper-agent
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

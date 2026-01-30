import { handleHelp, handleVersion, isHelpRequest, isVersionRequest } from '../utils/cli';

export function parseArgs() {
	const args = process.argv.slice(2);
	if (isHelpRequest(args)) {
		handleHelp();
	}
	if (isVersionRequest(args)) {
		handleVersion();
	}
}

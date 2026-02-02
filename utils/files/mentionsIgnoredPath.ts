import { isIgnored } from './aiignore';

/**
 * Heuristically extracts potential paths from a shell command and checks if any are ignored by .aiignore.
 * @param command The shell command to check.
 * @returns True if the command mentions an ignored path, false otherwise.
 */
export function mentionsIgnoredPath(command: string): boolean {
	// Regex to match:
	// 1. Double quoted strings: "..."
	// 2. Single quoted strings: '...'
	// 3. Unquoted words (not including shell operators like ;, |, &, <, >, but including / and .)
	const partRegex = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|([^\s;&|><]+)/g;

	let match;
	while ((match = partRegex.exec(command)) !== null) {
		const pathCandidate = match[1] ?? match[2] ?? match[3];

		if (pathCandidate && isIgnored(pathCandidate)) {
			return true;
		}
	}

	return false;
}

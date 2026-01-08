import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';

let ignorePatterns: string[] = [];

/**
 * Loads patterns from the .aiignore file in the current working directory.
 */
export function loadAiIgnore() {
	const ignorePath = path.join(process.cwd(), '.aiignore');
	if (existsSync(ignorePath)) {
		try {
			const content = readFileSync(ignorePath, 'utf-8');
			ignorePatterns = content
				.split(/\r?\n/)
				.map(line => line.trim())
				.filter(line => line && !line.startsWith('#'));
		} catch (error) {
			console.error(`Error reading .aiignore: ${error}`);
			ignorePatterns = [];
		}
	} else {
		ignorePatterns = [];
	}
}

/**
 * Checks if a given file path should be ignored based on .aiignore patterns.
 * @param filePath The path to check.
 * @returns True if the path is ignored, false otherwise.
 */
export function isIgnored(filePath: string): boolean {
	loadAiIgnore();
	if (ignorePatterns.length === 0) return false;

	let relativePath = filePath;
	if (path.isAbsolute(filePath)) {
		if (filePath.startsWith(process.cwd())) {
			relativePath = path.relative(process.cwd(), filePath);
		} else {
			// If it's absolute but outside CWD, we don't ignore it by default
			// unless we want to support global ignores, but .aiignore is per-project.
			return false;
		}
	}

	const normalizedPath = path.normalize(relativePath);
	const parts = normalizedPath.split(path.sep);

	return ignorePatterns.some(pattern => {
		// Handle absolute-like patterns (starting with /)
		if (pattern.startsWith('/')) {
			const normalizedPattern = path.normalize(pattern.substring(1));
			return normalizedPath === normalizedPattern || normalizedPath.startsWith(normalizedPattern + path.sep);
		}

		// Handle patterns that match anywhere in the path
		return parts.some((part, index) => {
			const subPath = parts.slice(index).join(path.sep);
			const normalizedPattern = path.normalize(pattern);
			return subPath === normalizedPattern || subPath.startsWith(normalizedPattern + path.sep);
		});
	});
}

export function filterIgnored(files: string[]): string[] {
	return files.filter(file => !isIgnored(file));
}

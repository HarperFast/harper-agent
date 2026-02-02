import { existsSync, readFileSync } from 'node:fs';
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
				.filter(line => line && !line.startsWith('#'))
				.map(pattern => (pattern.endsWith('/') || pattern.endsWith('\\')) ? pattern.slice(0, -1) : pattern);
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
 * @param filePath The path to check (can be relative or absolute).
 * @returns True if the path is ignored, false otherwise.
 */
export function isIgnored(filePath: string): boolean {
	// Always treat any path mentioning a `.aiignore` segment as ignored, regardless of location
	const directParts = path.normalize(filePath).split(path.sep);
	if (directParts.includes('.aiignore')) {
		return true;
	}

	const absolutePath = path.resolve(process.cwd(), filePath);
	const relativePath = path.relative(process.cwd(), absolutePath);

	// If the path is outside the project root, it's not handled by .aiignore patterns
	if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
		return false;
	}

	const normalizedPath = path.normalize(relativePath);
	const parts = normalizedPath.split(path.sep);

	loadAiIgnore();
	if (ignorePatterns.length === 0) {
		return false;
	}

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

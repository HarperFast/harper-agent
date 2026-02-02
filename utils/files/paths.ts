import path from 'node:path';
import { isIgnored } from './aiignore';

/**
 * Resolves a path relative to the workspace root and ensures it's within the workspace.
 * @param root The workspace root directory.
 * @param relativePath The path provided by the LLM (can be relative or absolute).
 * @returns The resolved absolute path.
 * @throws Error if the path is outside the workspace or ignored.
 */
export function resolvePath(root: string, relativePath: string): string {
	const resolved = path.resolve(root, relativePath);
	const relative = path.relative(root, resolved);

	if (relative.startsWith('..') || path.isAbsolute(relative)) {
		throw new Error(`Operation outside workspace: ${relativePath}`);
	}

	if (isIgnored(resolved)) {
		throw new Error(`Operation restricted by .aiignore: ${relativePath}`);
	}

	return resolved;
}

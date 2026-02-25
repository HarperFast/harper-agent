import type { ApplyPatchResult, Editor } from '@openai/agents';
import { applyDiff } from '@openai/agents';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { normalizeDiff } from '../../utils/files/normalizeDiff';
import { resolvePath } from '../../utils/files/paths';

export class WorkspaceEditor implements Editor {
	private readonly root: () => string;

	constructor(root: () => string) {
		this.root = root;
	}

	async createFile(operation: CreateFileOperation): Promise<ApplyPatchResult> {
		try {
			const targetPath = resolvePath(this.root(), operation.path);
			await mkdir(path.dirname(targetPath), { recursive: true });
			const normalizedDiff = normalizeDiff(operation.diff);
			const content = applyDiff('', normalizedDiff, 'create');
			await writeFile(targetPath, content, 'utf8');
			return { status: 'completed', output: `Created ${operation.path}` };
		} catch (err) {
			return { status: 'failed', output: `Error creating ${operation.path}: ${String(err)}` };
		}
	}

	async updateFile(operation: UpdateFileOperation): Promise<ApplyPatchResult> {
		try {
			const targetPath = resolvePath(this.root(), operation.path);
			if (!existsSync(targetPath)) {
				return { status: 'failed', output: 'Error: file not found at path ' + targetPath };
			}
			const original = readFileSync(targetPath, 'utf8');
			const normalizedDiff = normalizeDiff(operation.diff);
			const patched = applyDiff(original, normalizedDiff);
			await writeFile(targetPath, patched, 'utf8');
			return { status: 'completed', output: `Updated ${operation.path}` };
		} catch (err) {
			return { status: 'failed', output: `Error updating ${operation.path}: ${String(err)}` };
		}
	}

	async overwriteFile(operation: OverwriteFileOperation): Promise<ApplyPatchResult> {
		try {
			const targetPath = resolvePath(this.root(), operation.path);
			await mkdir(path.dirname(targetPath), { recursive: true });

			const normalizedInput = normalizeDiff(operation.diff);
			const lines = normalizedInput.split(/\r?\n/);
			const hasDiffMarkers = lines.some((line) => line.startsWith('+') || line.startsWith('-'));

			let finalContent: string;
			if (hasDiffMarkers) {
				finalContent = lines
					.filter((line) => !line.startsWith('-'))
					.map((line) => (line.startsWith('+') || line.startsWith(' ') ? line.slice(1) : line))
					.join('\n');
			} else {
				finalContent = normalizedInput;
			}

			await writeFile(targetPath, finalContent, 'utf8');
			return { status: 'completed', output: `Overwrote ${operation.path}` };
		} catch (err) {
			return { status: 'failed', output: `Error overwriting ${operation.path}: ${String(err)}` };
		}
	}

	async deleteFile(operation: DeleteFileOperation): Promise<ApplyPatchResult> {
		try {
			const targetPath = resolvePath(this.root(), operation.path);
			if (!existsSync(targetPath)) {
				return { status: 'failed', output: 'Error: file not found at path ' + targetPath };
			}
			await rm(targetPath, { force: true });
			return { status: 'completed', output: `Deleted ${operation.path}` };
		} catch (err) {
			return { status: 'failed', output: `Error deleting ${operation.path}: ${String(err)}` };
		}
	}
}

interface CreateFileOperation {
	type: 'create_file';
	path: string;
	diff: string;
}

interface UpdateFileOperation {
	type: 'update_file';
	path: string;
	diff: string;
}

interface OverwriteFileOperation {
	type: 'overwrite_file';
	path: string;
	diff: string;
}

interface DeleteFileOperation {
	type: 'delete_file';
	path: string;
}

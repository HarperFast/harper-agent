import { applyDiff } from '@openai/agents';
import type { ApplyPatchResult, Editor } from '@openai/agents-core';
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

interface DeleteFileOperation {
	type: 'delete_file';
	path: string;
}

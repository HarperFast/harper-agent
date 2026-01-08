import {applyDiff} from '@openai/agents';
import type {ApplyPatchResult, Editor} from '@openai/agents-core';
import {mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {isIgnored} from '../utils/aiignore.ts';

export class WorkspaceEditor implements Editor {
    private readonly root: string;

    constructor(root: string) {
        this.root = root;
    }

    async createFile(operation: CreateFileOperation): Promise<ApplyPatchResult|void> {
        const targetPath = await this.resolve(operation.path);
        await mkdir(path.dirname(targetPath), {recursive: true});
        const content = applyDiff('', operation.diff, 'create');
        await writeFile(targetPath, content, 'utf8');
        return {status: 'completed', output: `Created ${operation.path}`};
    }

    async updateFile(operation: UpdateFileOperation): Promise<ApplyPatchResult|void> {
        const targetPath = await this.resolve(operation.path);
        const original = await readFile(targetPath, 'utf8').catch((error: any) => {
            if (error?.code === 'ENOENT') {
                throw new Error(`Cannot update missing file: ${operation.path}`);
            }
            throw error;
        });
        const patched = applyDiff(original, operation.diff);
        await writeFile(targetPath, patched, 'utf8');
        return {status: 'completed', output: `Updated ${operation.path}`};
    }

    async deleteFile(operation: DeleteFileOperation): Promise<ApplyPatchResult|void> {
        const targetPath = await this.resolve(operation.path);
        await rm(targetPath, {force: true});
        return {status: 'completed', output: `Deleted ${operation.path}`};
    }

    private async resolve(relativePath: string): Promise<string> {
        if (isIgnored(relativePath)) {
            throw new Error(`Operation restricted by .aiignore: ${relativePath}`);
        }
        const resolved = path.resolve(this.root, relativePath);
        if (!resolved.startsWith(this.root)) {
            throw new Error(`Operation outside workspace: ${relativePath}`);
        }
        return resolved;
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

import { applyDiff } from '@openai/agents';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeDiff } from '../../utils/files/normalizeDiff';
import { WorkspaceEditor } from './workspaceEditor';

vi.mock('@openai/agents', () => ({
	applyDiff: vi.fn().mockReturnValue('patched content'),
}));

vi.mock('../../utils/files/normalizeDiff', () => ({
	normalizeDiff: vi.fn((diff) => `normalized ${diff}`),
}));

// Mock sync fs methods used by workspaceEditor now (existsSync, readFileSync)
vi.mock('node:fs', () => ({
	existsSync: vi.fn().mockReturnValue(true),
	readFileSync: vi.fn().mockReturnValue('original content'),
}));

vi.mock('node:fs/promises', () => ({
	mkdir: vi.fn().mockResolvedValue(undefined),
	rm: vi.fn().mockResolvedValue(undefined),
	writeFile: vi.fn().mockResolvedValue(undefined),
}));

describe('WorkspaceEditor', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('updateFile', () => {
		it('should normalize diff by default', async () => {
			const editor = new WorkspaceEditor('/root', true);
			await editor.updateFile({ type: 'update_file', path: 'test.txt', diff: 'some diff' });

			expect(normalizeDiff).toHaveBeenCalledWith('some diff');
			expect(applyDiff).toHaveBeenCalledWith('original content', 'normalized some diff');
		});

		it('should normalize diff when shouldNormalize is true', async () => {
			const editor = new WorkspaceEditor('/root', true);
			await editor.updateFile({ type: 'update_file', path: 'test.txt', diff: 'some diff' });

			expect(normalizeDiff).toHaveBeenCalledWith('some diff');
			expect(applyDiff).toHaveBeenCalledWith('original content', 'normalized some diff');
		});

		it('should NOT normalize diff when shouldNormalize is false', async () => {
			const editor = new WorkspaceEditor('/root', false);
			await editor.updateFile({ type: 'update_file', path: 'test.txt', diff: 'some diff' });

			expect(normalizeDiff).not.toHaveBeenCalled();
			expect(applyDiff).toHaveBeenCalledWith('original content', 'some diff');
		});
	});

	describe('createFile', () => {
		it('should normalize diff by default', async () => {
			const editor = new WorkspaceEditor('/root', true);
			await editor.createFile({ type: 'create_file', path: 'new.txt', diff: 'new diff' });

			expect(normalizeDiff).toHaveBeenCalledWith('new diff');
			expect(applyDiff).toHaveBeenCalledWith('', 'normalized new diff', 'create');
		});

		it('should NOT normalize diff when shouldNormalize is false', async () => {
			const editor = new WorkspaceEditor('/root', false);
			await editor.createFile({ type: 'create_file', path: 'new.txt', diff: 'new diff' });

			expect(normalizeDiff).not.toHaveBeenCalled();
			expect(applyDiff).toHaveBeenCalledWith('', 'new diff', 'create');
		});
	});
});

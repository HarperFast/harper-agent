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
		it('should normalize diffs', async () => {
			const editor = new WorkspaceEditor(() => '/root');
			await editor.updateFile({ type: 'update_file', path: 'test.txt', diff: 'some diff' });

			expect(normalizeDiff).toHaveBeenCalledWith('some diff');
			expect(applyDiff).toHaveBeenCalledWith('original content', 'normalized some diff');
		});
	});

	describe('createFile', () => {
		it('should normalize diffs', async () => {
			const editor = new WorkspaceEditor(() => '/root');
			await editor.createFile({ type: 'create_file', path: 'new.txt', diff: 'new diff' });

			expect(normalizeDiff).toHaveBeenCalledWith('new diff');
			expect(applyDiff).toHaveBeenCalledWith('', 'normalized new diff', 'create');
		});
	});

	describe('overwriteFile', () => {
		it('should overwrite with raw content if no diff markers', async () => {
			const editor = new WorkspaceEditor(() => '/root');
			const { writeFile } = await import('node:fs/promises');
			await editor.overwriteFile({ type: 'overwrite_file', path: 'test.txt', diff: 'raw content' });

			// normalizeDiff returns `normalized ${diff}` in mocks
			expect(writeFile).toHaveBeenCalledWith(expect.any(String), 'normalized raw content', 'utf8');
		});

		it('should extract positive changes if diff markers present', async () => {
			const editor = new WorkspaceEditor(() => '/root');
			const { writeFile } = await import('node:fs/promises');

			// Just mock normalizeDiff to return the input for this test
			vi.mocked(normalizeDiff).mockImplementationOnce((diff) => diff);

			const diff = [
				' some context',
				'-removed line',
				'+added line',
				'another line',
			].join('\n');
			await editor.overwriteFile({ type: 'overwrite_file', path: 'test.txt', diff });

			const expected = [
				'some context',
				'added line',
				'another line',
			].join('\n');
			expect(writeFile).toHaveBeenCalledWith(expect.any(String), expected, 'utf8');
		});
	});
});

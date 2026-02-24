import { mkdtemp, realpath, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { trackedState } from '../../lifecycle/trackedState';
import { execute as changeCwd } from './changeCwdTool';

describe('changeCwdTool', () => {
	const originalCwd = process.cwd();
	let tempDir: string;
	let baseRoot: string;

	beforeEach(async () => {
		// Use OS temp directory as the root to satisfy resolvePath constraints
		baseRoot = os.tmpdir();
		process.chdir(baseRoot);
		// Keep trackedState in sync with the actual cwd (realpath may differ on macOS)
		trackedState.cwd = process.cwd();
		// Create the temp directory under the current (tmp) cwd to ensure resolvePath allows it
		tempDir = await mkdtemp(path.join(process.cwd(), 'harper-cwd-'));
	});

	afterEach(async () => {
		try {
			process.chdir(originalCwd);
			trackedState.cwd = originalCwd;
		} catch {}
		try {
			await rm(tempDir, { recursive: true, force: true });
		} catch {}
	});

	it('switches to an absolute directory path', async () => {
		const result = await changeCwd({ path: tempDir } as any);
		expect(result).toContain('Switched current working directory');
		const expected = await realpath(tempDir);
		expect(process.cwd()).toBe(expected);
		expect(trackedState.cwd).toBe(expected);
	});

	it('switches to a relative directory path from current tracked cwd', async () => {
		// First hop to tempDir, then create a child directory and cd into it by relative name
		await changeCwd({ path: tempDir } as any);
		const child = path.join(tempDir, 'child');
		await (await import('node:fs/promises')).mkdir(child);
		const result = await changeCwd({ path: 'child' } as any);
		expect(result).toContain('Switched current working directory');
		const expected = await realpath(child);
		expect(process.cwd()).toBe(expected);
		expect(trackedState.cwd).toBe(expected);
	});

	it('returns an error for non-existent path and does not change cwd', async () => {
		const before = process.cwd();
		const result = await changeCwd({ path: path.join(tempDir, 'does-not-exist') } as any);
		expect(result).toContain('Failed to change directory');
		expect(process.cwd()).toBe(before);
		expect(trackedState.cwd).toBe(before);
	});
});

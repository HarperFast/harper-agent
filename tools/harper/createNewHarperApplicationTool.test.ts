vi.mock('node:child_process', async (importOriginal) => {
	const actual = await importOriginal<typeof import('node:child_process')>();
	return {
		...actual,
		execSync: vi.fn((command: any) => {
			if (typeof command === 'string' && command.startsWith('npm create harper')) {
				return 'created ok';
			}
			return Buffer.from('');
		}),
	};
});
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { trackedState } from '../../lifecycle/trackedState';
import { execute as createHarper } from './createNewHarperApplicationTool';

describe('createNewHarperApplicationTool', () => {
	const originalCwd = process.cwd();
	let baseDir: string;

	beforeEach(async () => {
		vi.restoreAllMocks();
		baseDir = path.join(originalCwd, `.tmp-create-app-${Date.now()}-${Math.random().toString(36).slice(2)}`);
		await mkdir(baseDir, { recursive: true });
		process.chdir(baseDir);
		trackedState.cwd = baseDir;
	});

	afterEach(async () => {
		process.chdir(originalCwd);
		trackedState.cwd = originalCwd;
		await rm(baseDir, { recursive: true, force: true });
	});

	it('automatically switches cwd to the created directory and suggests reading AGENTS.md if it exists', async () => {
		const appName = 'my-app';
		const resolved = path.join(baseDir, appName);
		await mkdir(resolved, { recursive: true }); // simulate a directory created by npm
		await writeFile(path.join(resolved, 'AGENTS.md'), '# Agents');

		const result = await createHarper({ directoryName: appName, template: 'vanilla-ts' } as any);
		expect(result).toContain('Successfully created a new Harper application');
		expect(result).toContain('I strongly suggest you use these newfound skills!');
		expect(result).toContain('AGENTS.md');
		expect(process.cwd()).toBe(resolved);
		expect(trackedState.cwd).toBe(resolved);
	});

	it('does not strongly suggest reading AGENTS.md if it does not exist', async () => {
		const appName = 'no-agents-app';
		const resolved = path.join(baseDir, appName);
		await mkdir(resolved, { recursive: true });

		const result = await createHarper({ directoryName: appName, template: 'vanilla-ts' } as any);
		expect(result).toContain('Successfully created a new Harper application');
		expect(result).not.toContain('I strongly suggest you read it next');
		expect(result).not.toContain('AGENTS.md');
		expect(process.cwd()).toBe(resolved);
		expect(trackedState.cwd).toBe(resolved);
	});
});

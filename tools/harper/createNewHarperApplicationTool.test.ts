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
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { agentsSkillDir, agentsSkillReference } from '../../lifecycle/agentsSkillReference';
import { trackedState } from '../../lifecycle/trackedState';
import { execute as createHarper } from './createNewHarperApplicationTool';

describe('createNewHarperApplicationTool', () => {
	const originalCwd = process.cwd();
	let baseDir: string;

	beforeEach(async () => {
		vi.restoreAllMocks();
		baseDir = await mkdtemp(path.join(os.tmpdir(), 'harper-create-app-'));
		await mkdir(baseDir, { recursive: true });
		process.chdir(baseDir);
		trackedState.cwd = baseDir;
	});

	afterEach(async () => {
		process.chdir(originalCwd);
		trackedState.cwd = originalCwd;
		await rm(baseDir, { recursive: true, force: true });
	});

	it('automatically switches cwd to the created directory and suggests reading agent skills if it exists', async () => {
		const appName = 'my-app';
		const appDir = path.join(baseDir, appName);
		const skillsDir = path.join(appDir, agentsSkillDir);
		const skillsFile = path.join(appDir, agentsSkillReference);
		await mkdir(skillsDir, { recursive: true }); // simulate a directory created by npm
		await writeFile(skillsFile, '# Agents');

		const result = await createHarper({ directoryName: appName, template: 'vanilla-ts' });
		expect(result).toContain('Successfully created a new Harper application');
		expect(result).toContain('I strongly suggest you use these newfound skills!');
		expect(result).toContain(agentsSkillReference);
		const expected = await realpath(appDir);
		expect(process.cwd()).toBe(expected);
		expect(trackedState.cwd).toBe(expected);
	});

	it('does not strongly suggest reading agent skills if it does not exist', async () => {
		const appName = 'no-agents-app';
		const resolved = path.join(baseDir, appName);
		await mkdir(resolved, { recursive: true });

		const result = await createHarper({ directoryName: appName, template: 'vanilla-ts' });
		expect(result).toContain('Successfully created a new Harper application');
		expect(result).not.toContain('I strongly suggest you read it next');
		expect(result).not.toContain(agentsSkillReference);
		const expected = await realpath(resolved);
		expect(process.cwd()).toBe(expected);
		expect(trackedState.cwd).toBe(expected);
	});
});

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateEnv } from './updateEnv';

vi.mock('node:fs');
vi.mock('../../lifecycle/trackedState', () => ({
	trackedState: {
		cwd: '/test/cwd',
	},
}));

describe('updateEnv', () => {
	const topLevelEnvPath = join(homedir(), '.harper', 'harper-agent-env');
	const localEnvPath = join('/test/cwd', '.env');

	beforeEach(() => {
		vi.clearAllMocks();
		delete process.env.TEST_VAR;
	});

	it('should update top-level env if it exists', () => {
		vi.mocked(existsSync).mockImplementation((path) => path === topLevelEnvPath);
		vi.mocked(readFileSync).mockReturnValue('EXISTING=value\n');

		updateEnv('TEST_VAR', 'new_value');

		expect(process.env.TEST_VAR).toBe('new_value');
		expect(writeFileSync).toHaveBeenCalledWith(topLevelEnvPath, 'EXISTING=value\nTEST_VAR=new_value\n');
	});

	it('should update local .env if top-level does not exist', () => {
		vi.mocked(existsSync).mockImplementation((path) => path === localEnvPath);
		vi.mocked(readFileSync).mockReturnValue('EXISTING=value\n');

		updateEnv('TEST_VAR', 'new_value');

		expect(process.env.TEST_VAR).toBe('new_value');
		expect(writeFileSync).toHaveBeenCalledWith(localEnvPath, 'EXISTING=value\nTEST_VAR=new_value\n');
	});

	it('should create top-level env if neither exists', () => {
		vi.mocked(existsSync).mockReturnValue(false);

		updateEnv('TEST_VAR', 'new_value');

		expect(process.env.TEST_VAR).toBe('new_value');
		expect(mkdirSync).toHaveBeenCalledWith(dirname(topLevelEnvPath), { recursive: true });
		expect(writeFileSync).toHaveBeenCalledWith(topLevelEnvPath, 'TEST_VAR=new_value\n');
	});

	it('should overwrite existing key in top-level env', () => {
		vi.mocked(existsSync).mockImplementation((path) => path === topLevelEnvPath);
		vi.mocked(readFileSync).mockReturnValue('TEST_VAR=old_value\nOTHER=val');

		updateEnv('TEST_VAR', 'new_value');

		expect(writeFileSync).toHaveBeenCalledWith(topLevelEnvPath, 'TEST_VAR=new_value\nOTHER=val');
	});
});

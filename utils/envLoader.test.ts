import dotenv from 'dotenv';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadEnv } from './envLoader';

vi.mock('node:fs');
vi.mock('dotenv');

describe('envLoader', () => {
	const topLevelEnvPath = join(homedir(), '.harper', 'harper-agent-env');
	const localEnvPath = join(process.cwd(), '.env');

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should load only top-level env if local .env does not exist', () => {
		vi.mocked(existsSync).mockImplementation((path) => path === topLevelEnvPath);

		loadEnv();

		expect(dotenv.config).toHaveBeenCalledTimes(1);
		expect(dotenv.config).toHaveBeenCalledWith({ path: topLevelEnvPath, quiet: true });
	});

	it('should load only local .env if top-level does not exist', () => {
		vi.mocked(existsSync).mockImplementation((path) => path === localEnvPath);

		loadEnv();

		expect(dotenv.config).toHaveBeenCalledTimes(1);
		expect(dotenv.config).toHaveBeenCalledWith({ path: localEnvPath, override: true, quiet: true });
	});

	it('should load both and override if both exist', () => {
		vi.mocked(existsSync).mockReturnValue(true);

		loadEnv();

		expect(dotenv.config).toHaveBeenCalledTimes(2);
		expect(dotenv.config).toHaveBeenNthCalledWith(1, { path: topLevelEnvPath, quiet: true });
		expect(dotenv.config).toHaveBeenNthCalledWith(2, { path: localEnvPath, override: true, quiet: true });
	});

	it('should load nothing if neither exist', () => {
		vi.mocked(existsSync).mockReturnValue(false);

		loadEnv();

		expect(dotenv.config).not.toHaveBeenCalled();
	});
});

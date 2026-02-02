import spawn from 'cross-spawn';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkForUpdate } from './checkForUpdate';
import { getLatestVersion } from './getLatestVersion';
import { getOwnPackageJson } from './getOwnPackageJson';
import { isVersionNewer } from './isVersionNewer';

vi.mock('./getLatestVersion.js');
vi.mock('./getOwnPackageJson.js');
vi.mock('./isVersionNewer.js');
vi.mock('cross-spawn');

describe('checkForUpdate', () => {
	const originalEnv = process.env;
	const originalArgv = process.argv;

	beforeEach(() => {
		vi.resetAllMocks();
		process.env = { ...originalEnv };
		process.argv = [...originalArgv];
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(process, 'exit').mockImplementation(() => {
			return undefined as never;
		});
	});

	afterEach(() => {
		process.env = originalEnv;
		process.argv = originalArgv;
	});

	it('should return version if HAIRPER_SKIP_UPDATE is set', async () => {
		process.env.HAIRPER_SKIP_UPDATE = '1';
		vi.mocked(getOwnPackageJson).mockReturnValue({ name: 'hairper', version: '1.0.0' });

		const version = await checkForUpdate();
		expect(version).toBe('1.0.0');
		expect(getLatestVersion).not.toHaveBeenCalled();
	});

	it('should return version if no new version is available', async () => {
		vi.mocked(getOwnPackageJson).mockReturnValue({ name: 'hairper', version: '1.0.0' });
		vi.mocked(getLatestVersion).mockResolvedValue('1.0.0');
		vi.mocked(isVersionNewer).mockReturnValue(false);

		const version = await checkForUpdate();
		expect(version).toBe('1.0.0');
		expect(spawn.sync).not.toHaveBeenCalled();
	});

	it('should attempt to update if a newer version is available', async () => {
		vi.mocked(getOwnPackageJson).mockReturnValue({ name: 'hairper', version: '1.0.0' });
		vi.mocked(getLatestVersion).mockResolvedValue('1.1.0');
		vi.mocked(isVersionNewer).mockReturnValue(true);
		vi.mocked(spawn.sync).mockReturnValue({ stdout: '', status: 0 } as any);

		await checkForUpdate();

		expect(console.log).toHaveBeenCalledWith(expect.stringContaining('A new version of hairper is available'));
		expect(spawn.sync).toHaveBeenCalledWith(
			'npx',
			expect.arrayContaining(['-y', 'hairper@latest']),
			expect.any(Object),
		);
		expect(process.exit).toHaveBeenCalledWith(0);
	});

	it('should clear npx cache if existing entries are found', async () => {
		vi.mocked(getOwnPackageJson).mockReturnValue({ name: 'hairper', version: '1.0.0' });
		vi.mocked(getLatestVersion).mockResolvedValue('1.1.0');
		vi.mocked(isVersionNewer).mockReturnValue(true);

		// Mock npm cache npx ls
		vi.mocked(spawn.sync).mockImplementation((cmd, args) => {
			if (cmd === 'npm' && args && args[2] === 'ls') {
				return { stdout: 'key1: hairper@1.0.0\nkey2: otherpkg@1.0.0', status: 0 } as any;
			}
			return { stdout: '', status: 0 } as any;
		});

		await checkForUpdate();

		expect(spawn.sync).toHaveBeenCalledWith('npm', ['cache', 'npx', 'rm', 'key1'], expect.any(Object));
		expect(process.exit).toHaveBeenCalled();
	});

	it('should continue if update check fails', async () => {
		vi.mocked(getOwnPackageJson).mockReturnValue({ name: 'hairper', version: '1.0.0' });
		vi.mocked(getLatestVersion).mockRejectedValue(new Error('Network error'));

		const version = await checkForUpdate();
		expect(version).toBe('1.0.0');
	});
});

import spawn from 'cross-spawn';
import { render } from 'ink';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { updateEnv } from '../files/updateEnv';
import { checkForUpdate } from './checkForUpdate';
import { getLatestVersion } from './getLatestVersion';
import { getOwnPackageJson } from './getOwnPackageJson';
import { isVersionNewer } from './isVersionNewer';

vi.mock('./getLatestVersion.js');
vi.mock('./getOwnPackageJson.js');
vi.mock('./isVersionNewer.js');
vi.mock('cross-spawn');
vi.mock('ink', async (importOriginal) => {
	const original = await importOriginal<typeof import('ink')>();
	return {
		...original,
		render: vi.fn(),
	};
});
vi.mock('../files/updateEnv.js');

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

		// Default mock for render to simulate a selection
		vi.mocked(render).mockImplementation((element: any) => {
			const { onSelect } = element.props;
			// We'll override this in specific tests if needed
			if (onSelect) {
				// Default to 'now' to satisfy existing tests that expect update
				setTimeout(() => onSelect('now'), 0);
			}
			return { unmount: vi.fn() } as any;
		});
	});

	afterEach(() => {
		process.env = originalEnv;
		process.argv = originalArgv;
	});

	it('should return version if HARPER_AGENT_SKIP_UPDATE is set', async () => {
		process.env.HARPER_AGENT_SKIP_UPDATE = '1';
		vi.mocked(getOwnPackageJson).mockReturnValue({ name: '@harperfast/agent', version: '1.0.0' });

		const version = await checkForUpdate();
		expect(version).toBe('1.0.0');
		expect(getLatestVersion).not.toHaveBeenCalled();
	});

	it('should return version if no new version is available', async () => {
		vi.mocked(getOwnPackageJson).mockReturnValue({ name: '@harperfast/agent', version: '1.0.0' });
		vi.mocked(getLatestVersion).mockResolvedValue('1.0.0');
		vi.mocked(isVersionNewer).mockReturnValue(false);

		const version = await checkForUpdate();
		expect(version).toBe('1.0.0');
		expect(spawn.sync).not.toHaveBeenCalled();
	});

	it('should attempt to update if a newer version is available', async () => {
		vi.mocked(getOwnPackageJson).mockReturnValue({ name: '@harperfast/agent', version: '1.0.0' });
		vi.mocked(getLatestVersion).mockResolvedValue('1.1.0');
		vi.mocked(isVersionNewer).mockReturnValue(true);
		vi.mocked(spawn.sync).mockReturnValue({ stdout: '', status: 0 } as any);

		await checkForUpdate();

		expect(spawn.sync).toHaveBeenCalledWith(
			'npx',
			expect.arrayContaining(['-y', '@harperfast/agent@latest']),
			expect.any(Object),
		);
		expect(process.exit).toHaveBeenCalledWith(0);
	});

	it('should clear npx cache if existing entries are found', async () => {
		vi.mocked(getOwnPackageJson).mockReturnValue({ name: '@harperfast/agent', version: '1.0.0' });
		vi.mocked(getLatestVersion).mockResolvedValue('1.1.0');
		vi.mocked(isVersionNewer).mockReturnValue(true);

		// Mock npm cache npx ls
		vi.mocked(spawn.sync).mockImplementation((cmd, args) => {
			if (cmd === 'npm' && args && args[2] === 'ls') {
				return { stdout: 'key1: @harperfast/agent@1.0.0\nkey2: otherpkg@1.0.0', status: 0 } as any;
			}
			return { stdout: '', status: 0 } as any;
		});

		await checkForUpdate();

		expect(spawn.sync).toHaveBeenCalledWith('npm', ['cache', 'npx', 'rm', 'key1'], expect.any(Object));
		expect(process.exit).toHaveBeenCalled();
	});

	it('should attempt to update via npm -g if installed globally', async () => {
		vi.mocked(getOwnPackageJson).mockReturnValue({ name: '@harperfast/agent', version: '1.0.0' });
		vi.mocked(getLatestVersion).mockResolvedValue('1.1.0');
		vi.mocked(isVersionNewer).mockReturnValue(true);

		const globalRoot = '/usr/local/lib/node_modules';
		process.argv[1] = `${globalRoot}/@harperfast/agent/dist/agent.js`;

		vi.mocked(spawn.sync).mockImplementation((cmd, args) => {
			if (cmd === 'npm' && args && args[0] === 'root' && args[1] === '-g') {
				return { stdout: globalRoot, status: 0 } as any;
			}
			return { stdout: '', status: 0 } as any;
		});

		await checkForUpdate();

		expect(spawn.sync).toHaveBeenCalledWith(
			'npm',
			['install', '-g', '@harperfast/agent@latest'],
			expect.any(Object),
		);
		expect(spawn.sync).toHaveBeenCalledWith('harper-agent', expect.any(Array), expect.any(Object));
		expect(process.exit).toHaveBeenCalled();
	});

	it('should continue if update check fails', async () => {
		vi.mocked(getOwnPackageJson).mockReturnValue({ name: '@harperfast/agent', version: '1.0.0' });
		vi.mocked(getLatestVersion).mockRejectedValue(new Error('Network error'));

		const version = await checkForUpdate();
		expect(version).toBe('1.0.0');
	});

	it('should return version if user chooses to update later', async () => {
		vi.mocked(getOwnPackageJson).mockReturnValue({ name: '@harperfast/agent', version: '1.0.0' });
		vi.mocked(getLatestVersion).mockResolvedValue('1.1.0');
		vi.mocked(isVersionNewer).mockReturnValue(true);

		vi.mocked(render).mockImplementation((element: any) => {
			const { onSelect } = element.props;
			setTimeout(() => onSelect('later'), 0);
			return { unmount: vi.fn() } as any;
		});

		const version = await checkForUpdate();
		expect(version).toBe('1.0.0');
		expect(spawn.sync).not.toHaveBeenCalledWith('npx', expect.anything(), expect.anything());
	});

	it('should update env and return version if user chooses to never ask again', async () => {
		vi.mocked(getOwnPackageJson).mockReturnValue({ name: '@harperfast/agent', version: '1.0.0' });
		vi.mocked(getLatestVersion).mockResolvedValue('1.1.0');
		vi.mocked(isVersionNewer).mockReturnValue(true);

		vi.mocked(render).mockImplementation((element: any) => {
			const { onSelect } = element.props;
			setTimeout(() => onSelect('never'), 0);
			return { unmount: vi.fn() } as any;
		});

		const version = await checkForUpdate();
		expect(version).toBe('1.0.0');
		expect(updateEnv).toHaveBeenCalledWith('HARPER_AGENT_SKIP_UPDATE', '1');
		expect(spawn.sync).not.toHaveBeenCalledWith('npx', expect.anything(), expect.anything());
	});
});

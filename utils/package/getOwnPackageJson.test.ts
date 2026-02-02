import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getOwnPackageJson } from './getOwnPackageJson';

vi.mock('node:fs', () => ({
	readFileSync: vi.fn(),
}));

describe('getOwnPackageJson', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should return parsed package.json content', () => {
		const mockPkg = { name: 'my-pkg', version: '1.2.3' };
		vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockPkg));

		const pkg = getOwnPackageJson();
		expect(pkg).toEqual(mockPkg);
		expect(readFileSync).toHaveBeenCalled();
	});

	it('should return default values if reading fails', () => {
		vi.mocked(readFileSync).mockImplementation(() => {
			throw new Error('File not found');
		});

		const pkg = getOwnPackageJson();
		expect(pkg).toEqual({ name: 'hairper', version: '0.0.0' });
	});

	it('should return default values if JSON parsing fails', () => {
		vi.mocked(readFileSync).mockReturnValue('invalid json');

		const pkg = getOwnPackageJson();
		expect(pkg).toEqual({ name: 'hairper', version: '0.0.0' });
	});
});

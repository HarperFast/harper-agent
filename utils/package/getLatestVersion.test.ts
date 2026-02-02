import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLatestVersion } from './getLatestVersion';

describe('getLatestVersion', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should return the version from npm registry', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ version: '1.2.3' }),
		});
		vi.stubGlobal('fetch', mockFetch);

		const version = await getLatestVersion('hairper');
		expect(version).toBe('1.2.3');
		expect(mockFetch).toHaveBeenCalledWith(
			'https://registry.npmjs.org/hairper/latest',
			expect.any(Object),
		);
	});

	it('should return null if fetch fails', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: false,
		});
		vi.stubGlobal('fetch', mockFetch);

		const version = await getLatestVersion('hairper');
		expect(version).toBeNull();
	});

	it('should return null if fetch throws', async () => {
		const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
		vi.stubGlobal('fetch', mockFetch);

		const version = await getLatestVersion('hairper');
		expect(version).toBeNull();
	});
});

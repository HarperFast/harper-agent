import { describe, expect, it } from 'vitest';
import { isVersionNewer } from './isVersionNewer';

describe('isVersionNewer', () => {
	it('should return true if latest version is newer (major)', () => {
		expect(isVersionNewer('1.0.0', '0.9.0')).toBe(true);
	});

	it('should return true if latest version is newer (minor)', () => {
		expect(isVersionNewer('0.1.0', '0.0.9')).toBe(true);
	});

	it('should return true if latest version is newer (patch)', () => {
		expect(isVersionNewer('0.0.2', '0.0.1')).toBe(true);
	});

	it('should return false if versions are equal', () => {
		expect(isVersionNewer('1.0.0', '1.0.0')).toBe(false);
	});

	it('should return false if current version is newer', () => {
		expect(isVersionNewer('0.9.0', '1.0.0')).toBe(false);
	});

	it('should return false for invalid versions (too short)', () => {
		expect(isVersionNewer('1.0', '1.0.0')).toBe(false);
	});

	it('should handle non-numeric parts by stopping comparison', () => {
		expect(isVersionNewer('1.a.0', '1.0.0')).toBe(false);
	});
});

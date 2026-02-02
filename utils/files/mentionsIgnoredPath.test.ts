import { describe, expect, it, vi } from 'vitest';
import { isIgnored } from './aiignore';
import { mentionsIgnoredPath } from './mentionsIgnoredPath';

vi.mock('./aiignore.js', () => ({
	isIgnored: vi.fn(),
}));

describe('mentionsIgnoredPath', () => {
	it('should return true if a command mentions an ignored path (unquoted)', () => {
		vi.mocked(isIgnored).mockImplementation((p) => p === 'secret.txt');
		expect(mentionsIgnoredPath('cat secret.txt')).toBe(true);
	});

	it('should return true if a command mentions an ignored path (double quoted)', () => {
		vi.mocked(isIgnored).mockImplementation((p) => p === 'secret file.txt');
		expect(mentionsIgnoredPath('cat "secret file.txt"')).toBe(true);
	});

	it('should return true if a command mentions an ignored path (single quoted)', () => {
		vi.mocked(isIgnored).mockImplementation((p) => p === 'secret file.txt');
		expect(mentionsIgnoredPath("cat 'secret file.txt'")).toBe(true);
	});

	it('should return false if no ignored paths are mentioned', () => {
		vi.mocked(isIgnored).mockReturnValue(false);
		expect(mentionsIgnoredPath('ls -la src/')).toBe(false);
	});

	it('should handle multiple arguments and find the ignored one', () => {
		vi.mocked(isIgnored).mockImplementation((p) => p === 'ignored.js');
		expect(mentionsIgnoredPath('rm public.js ignored.js other.js')).toBe(true);
	});

	it('should ignore shell operators and still find paths', () => {
		vi.mocked(isIgnored).mockImplementation((p) => p === 'forbidden');
		expect(mentionsIgnoredPath('cat forbidden | grep something')).toBe(true);
		expect(mentionsIgnoredPath('cat safe > forbidden')).toBe(true);
		expect(mentionsIgnoredPath('cat safe; rm forbidden')).toBe(true);
	});
});

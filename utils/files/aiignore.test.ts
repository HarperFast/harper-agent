import * as fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isIgnored, loadAiIgnore } from './aiignore';

vi.mock('node:fs');

describe('aiignore', () => {
	const cwd = process.cwd();

	beforeEach(() => {
		vi.clearAllMocks();
		// Reset internal state if possible, or ensure each test sets it up
		vi.mocked(fs.existsSync).mockReturnValue(false);
	});

	describe('isIgnored', () => {
		it("should ignore .aiignore even if there isn't a .aiignore in place", () => {
			vi.mocked(fs.existsSync).mockReturnValue(false);

			expect(isIgnored('.aiignore')).toBe(true);
			expect(isIgnored('./.aiignore')).toBe(true);
			expect(isIgnored('subdir/.aiignore')).toBe(true);
			expect(isIgnored(path.join(cwd, '.aiignore'))).toBe(true);
			expect(isIgnored('.aiignore/somefile')).toBe(true);
		});

		it('should return false for paths outside project root', () => {
			// path.relative(cwd, '/outside') will start with '..'
			expect(isIgnored('../outside.txt')).toBe(false);
			expect(isIgnored('/outside.txt')).toBe(false);
		});

		it('should return false if .aiignore does not exist and path is not .aiignore', () => {
			vi.mocked(fs.existsSync).mockReturnValue(false);
			expect(isIgnored('src/index.ts')).toBe(false);
		});

		it('should return false if .aiignore is empty', () => {
			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fs.readFileSync).mockReturnValue('');
			expect(isIgnored('src/index.ts')).toBe(false);
		});

		it('should handle patterns starting with /', () => {
			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fs.readFileSync).mockReturnValue('/dist\n/build/');

			expect(isIgnored('dist/file.js')).toBe(true);
			expect(isIgnored('dist')).toBe(true);
			expect(isIgnored('subdir/dist/file.js')).toBe(false);
			expect(isIgnored('build/file.js')).toBe(true);
		});

		it('should handle patterns matching anywhere', () => {
			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fs.readFileSync).mockReturnValue('node_modules\ntemp');

			expect(isIgnored('node_modules/pkg/index.js')).toBe(true);
			expect(isIgnored('subdir/node_modules/pkg/index.js')).toBe(true);
			expect(isIgnored('temp')).toBe(true);
			expect(isIgnored('templates/index.html')).toBe(false); // 'temp' pattern shouldn't match 'templates' if it's a directory match
		});

		it('should handle comments and empty lines in .aiignore', () => {
			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fs.readFileSync).mockReturnValue('# this is a comment\n\n  \n  dist/  \n');

			expect(isIgnored('dist/file.js')).toBe(true);
			expect(isIgnored('src/file.js')).toBe(false);
		});

		it('should handle backslashes in patterns (if on Windows, but we normalize)', () => {
			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fs.readFileSync).mockReturnValue('folder\\');

			expect(isIgnored('folder/file.js')).toBe(true);
		});

		it('should handle patterns with internal slashes', () => {
			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fs.readFileSync).mockReturnValue('src/generated');

			expect(isIgnored('src/generated/file.ts')).toBe(true);
			expect(isIgnored('subdir/src/generated/file.ts')).toBe(true);
			expect(isIgnored('src/index.ts')).toBe(false);
		});

		it('should handle errors when reading .aiignore', () => {
			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fs.readFileSync).mockImplementation(() => {
				throw new Error('Read error');
			});
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			expect(isIgnored('src/index.ts')).toBe(false);
			expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error reading .aiignore'));

			consoleSpy.mockRestore();
		});
	});

	describe('loadAiIgnore', () => {
		it('should clear patterns if .aiignore does not exist', () => {
			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fs.readFileSync).mockReturnValue('dist/');
			isIgnored('dist/file.js'); // loads it

			vi.mocked(fs.existsSync).mockReturnValue(false);
			loadAiIgnore();

			// After clearing, dist/file.js should not be ignored anymore (except for .aiignore itself)
			vi.mocked(fs.existsSync).mockReturnValue(false);
			expect(isIgnored('dist/file.js')).toBe(false);
		});
	});
});

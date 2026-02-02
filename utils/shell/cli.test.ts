import { describe, expect, it, vi } from 'vitest';
import * as getOwnPackageJsonModule from '../package/getOwnPackageJson';
import { handleHelp, handleVersion, isHelpRequest, isVersionRequest } from './cli';

describe('cli utils', () => {
	describe('isHelpRequest', () => {
		it('should return true for --help', () => {
			expect(isHelpRequest(['--help'])).toBe(true);
		});

		it('should return true for -h', () => {
			expect(isHelpRequest(['-h'])).toBe(true);
		});

		it('should return true for help', () => {
			expect(isHelpRequest(['help'])).toBe(true);
		});

		it('should return true if any arg is a help request', () => {
			expect(isHelpRequest(['foo', '--help', 'bar'])).toBe(true);
		});

		it('should be case insensitive', () => {
			expect(isHelpRequest(['HELP'])).toBe(true);
		});

		it('should return false otherwise', () => {
			expect(isHelpRequest(['foo', 'bar'])).toBe(false);
		});
	});

	describe('isVersionRequest', () => {
		it('should return true for --version', () => {
			expect(isVersionRequest(['--version'])).toBe(true);
		});

		it('should return true for -v', () => {
			expect(isVersionRequest(['-v'])).toBe(true);
		});

		it('should return true for version', () => {
			expect(isVersionRequest(['version'])).toBe(true);
		});

		it('should be case insensitive', () => {
			expect(isVersionRequest(['VERSION'])).toBe(true);
		});

		it('should return false otherwise', () => {
			expect(isVersionRequest(['foo', 'bar'])).toBe(false);
		});
	});

	describe('handleHelp', () => {
		it('should call process.exit(0)', () => {
			const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
			const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
			handleHelp();
			expect(logSpy).toHaveBeenCalled();
			expect(exitSpy).toHaveBeenCalledWith(0);
			exitSpy.mockRestore();
			logSpy.mockRestore();
		});
	});

	describe('handleVersion', () => {
		it('should print version and call process.exit(0)', () => {
			const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
			const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
			vi.spyOn(getOwnPackageJsonModule, 'getOwnPackageJson').mockReturnValue({ version: '1.2.3' });

			handleVersion();

			expect(logSpy).toHaveBeenCalledWith('1.2.3');
			expect(exitSpy).toHaveBeenCalledWith(0);

			exitSpy.mockRestore();
			logSpy.mockRestore();
		});
	});
});

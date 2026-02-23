import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logError, setupGlobalErrorHandlers } from './logger';

vi.mock('node:fs');

describe('logger', () => {
	const ERROR_LOG_PATH = join(homedir(), '.harper', 'harper-agent-errors');

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-02-23T15:00:00.000Z'));
	});

	describe('logError', () => {
		it('should create directory and append error message with timestamp', () => {
			vi.mocked(existsSync).mockReturnValue(false);
			const error = new Error('Test error');
			error.stack = 'Test error stack';

			logError(error);

			expect(mkdirSync).toHaveBeenCalledWith(dirname(ERROR_LOG_PATH), { recursive: true });
			expect(appendFileSync).toHaveBeenCalledWith(
				ERROR_LOG_PATH,
				`[2026-02-23T15:00:00.000Z] Test error stack\n\n`,
				'utf8',
			);
		});

		it('should append string error if it is not an Error object', () => {
			vi.mocked(existsSync).mockReturnValue(true);

			logError('Simple string error');

			expect(mkdirSync).not.toHaveBeenCalled();
			expect(appendFileSync).toHaveBeenCalledWith(
				ERROR_LOG_PATH,
				`[2026-02-23T15:00:00.000Z] Simple string error\n\n`,
				'utf8',
			);
		});

		it('should fallback to console.error if logging fails', () => {
			vi.mocked(existsSync).mockReturnValue(true);
			vi.mocked(appendFileSync).mockImplementation(() => {
				throw new Error('Disk full');
			});
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			logError('fail');

			expect(consoleSpy).toHaveBeenCalledWith('Failed to write to error log:', expect.any(Error));
			expect(consoleSpy).toHaveBeenCalledWith('Original error:', 'fail');

			consoleSpy.mockRestore();
		});
	});

	describe('setupGlobalErrorHandlers', () => {
		it('should set up uncaughtException and unhandledRejection handlers', () => {
			const processSpy = vi.spyOn(process, 'on').mockImplementation(() => process as any);

			setupGlobalErrorHandlers();

			expect(processSpy).toHaveBeenCalledWith('uncaughtException', expect.any(Function));
			expect(processSpy).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));

			processSpy.mockRestore();
		});
	});
});

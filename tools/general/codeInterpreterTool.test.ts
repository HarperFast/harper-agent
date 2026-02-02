import { beforeEach, describe, expect, it, vi } from 'vitest';
import { spinner } from '../../utils/shell/spinner';
import { execute, needsApproval } from './codeInterpreterTool';

vi.mock('node:child_process', () => {
	const { promisify } = require('node:util');
	const mock = vi.fn();
	(mock as any)[promisify.custom] = vi.fn().mockResolvedValue({ stdout: 'mocked stdout', stderr: 'mocked stderr' });
	return {
		exec: mock,
	};
});

vi.mock('node:fs/promises', () => ({
	writeFile: vi.fn().mockResolvedValue(undefined),
	unlink: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../utils/shell/spinner', () => ({
	spinner: {
		start: vi.fn(),
		stop: vi.fn(),
	},
}));

describe('codeInterpreterTool', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('execute', () => {
		it('should execute python code by default', async () => {
			const result = await execute({ code: 'print("hello")', language: 'python' });
			expect(result).toContain('STDOUT:\nmocked stdout');
			expect(result).toContain('STDERR:\nmocked stderr');
		});

		it('should execute javascript code when specified', async () => {
			const result = await execute({ code: 'console.log("hello")', language: 'javascript' });
			expect(result).toContain('STDOUT:\nmocked stdout');
		});
	});

	describe('needsApproval', () => {
		it('should return true if CODE_INTERPRETER_AUTO_APPROVE is not set', async () => {
			delete process.env.CODE_INTERPRETER_AUTO_APPROVE;
			const result = await needsApproval({ isToolApproved: () => false } as any, {
				code: 'print("test")',
				language: 'python',
			});
			expect(result).toBe(true);
			expect(spinner.stop).toHaveBeenCalled();
			expect(spinner.start).not.toHaveBeenCalled();
		});

		it('should return false if CODE_INTERPRETER_AUTO_APPROVE is set to 1', async () => {
			process.env.CODE_INTERPRETER_AUTO_APPROVE = '1';
			const result = await needsApproval({ isToolApproved: () => false } as any, {
				code: 'print("test")',
				language: 'python',
			});
			expect(result).toBe(false);
			expect(spinner.stop).toHaveBeenCalled();
			expect(spinner.start).toHaveBeenCalled();
		});

		it('should return false if already approved', async () => {
			const result = await needsApproval(
				{ isToolApproved: () => true } as any,
				{ code: 'print("test")', language: 'python' },
				'call-123',
			);
			expect(result).toBe(false);
			expect(spinner.stop).not.toHaveBeenCalled();
		});
	});
});

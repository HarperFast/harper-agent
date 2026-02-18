import { beforeEach, describe, expect, it, vi } from 'vitest';
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
		it('should return true if HARPER_AGENT_AUTO_APPROVE_CODE_INTERPRETER is not set', async () => {
			delete process.env.HARPER_AGENT_AUTO_APPROVE_CODE_INTERPRETER;
			delete process.env.CODE_INTERPRETER_AUTO_APPROVE;
			const result = await needsApproval({ isToolApproved: () => false } as any, {
				code: 'print("test")',
				language: 'python',
			});
			expect(result).toBe(true);
		});

		it('should return false if HARPER_AGENT_AUTO_APPROVE_CODE_INTERPRETER is set to 1', async () => {
			process.env.HARPER_AGENT_AUTO_APPROVE_CODE_INTERPRETER = '1';
			const result = await needsApproval({ isToolApproved: () => false } as any, {
				code: 'print("test")',
				language: 'python',
			});
			expect(result).toBe(false);
		});

		it('should return false and log deprecation if CODE_INTERPRETER_AUTO_APPROVE is set to 1', async () => {
			delete process.env.HARPER_AGENT_AUTO_APPROVE_CODE_INTERPRETER;
			process.env.CODE_INTERPRETER_AUTO_APPROVE = '1';
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			const result = await needsApproval({ isToolApproved: () => false } as any, {
				code: 'print("test")',
				language: 'python',
			});

			expect(result).toBe(false);
			expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('CODE_INTERPRETER_AUTO_APPROVE is deprecated'));
			warnSpy.mockRestore();
		});

		it('should return false if already approved', async () => {
			const result = await needsApproval(
				{ isToolApproved: () => true } as any,
				{ code: 'print("test")', language: 'python' },
				'call-123',
			);
			expect(result).toBe(false);
		});
	});
});

import { describe, expect, it, vi } from 'vitest';
import { harperResponse } from './harperResponse';

describe('harperResponse', () => {
	it('should log formatted text to console when provided', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
		harperResponse('Hello world');
		expect(spy).toHaveBeenCalledWith(expect.stringContaining('Harper:'));
		expect(spy).toHaveBeenCalledWith(expect.stringContaining('Hello world'));
		spy.mockRestore();
	});

	it('should not log anything if text is undefined', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
		harperResponse(undefined);
		expect(spy).not.toHaveBeenCalled();
		spy.mockRestore();
	});

	it('should not log anything if text is empty string', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
		harperResponse('');
		expect(spy).not.toHaveBeenCalled();
		spy.mockRestore();
	});
});

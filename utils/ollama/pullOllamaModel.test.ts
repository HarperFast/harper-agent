import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pullOllamaModel } from './pullOllamaModel';

vi.stubGlobal('fetch', vi.fn());

describe('pullOllamaModel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		delete process.env.OLLAMA_BASE_URL;
	});

	it('should call pull endpoint with stream: true', async () => {
		const mockReader = {
			read: vi.fn()
				.mockResolvedValueOnce({
					done: false,
					value: new TextEncoder().encode(JSON.stringify({ status: 'pulling manifest' }) + '\n'),
				})
				.mockResolvedValueOnce({ done: true }),
		};
		(fetch as any).mockResolvedValue({
			ok: true,
			body: {
				getReader: () => mockReader,
			},
		});

		const progressCallback = vi.fn();
		await pullOllamaModel('llama3', progressCallback);

		expect(fetch).toHaveBeenCalledWith('http://localhost:11434/api/pull', {
			method: 'POST',
			body: JSON.stringify({ name: 'llama3', stream: true }),
		});
		expect(progressCallback).toHaveBeenCalledWith({ status: 'pulling manifest' });
	});

	it('should throw if pull fails', async () => {
		(fetch as any).mockResolvedValue({ ok: false, statusText: 'Bad Request' });
		await expect(pullOllamaModel('llama3')).rejects.toThrow('Failed to pull Ollama model llama3: Bad Request');
	});
});

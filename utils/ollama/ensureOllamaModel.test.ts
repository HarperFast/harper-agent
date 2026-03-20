import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureOllamaModel } from './ensureOllamaModel';

vi.stubGlobal('fetch', vi.fn());

describe('ensureOllamaModel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		delete process.env.OLLAMA_BASE_URL;
	});

	it('should not pull if model already exists', async () => {
		(fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => ({ models: [{ name: 'llama3' }] }),
		});

		await ensureOllamaModel('llama3');
		expect(fetch).toHaveBeenCalledTimes(1);
		expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining('/pull'), expect.anything());
	});

	it('should pull if model does not exist', async () => {
		(fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => ({ models: [{ name: 'mistral' }] }),
		});
		const mockReader = {
			read: vi.fn().mockResolvedValueOnce({ done: true }),
		};
		(fetch as any).mockResolvedValueOnce({
			ok: true,
			body: {
				getReader: () => mockReader,
			},
		});

		await ensureOllamaModel('llama3');
		expect(fetch).toHaveBeenCalledTimes(2);
		expect(fetch).toHaveBeenNthCalledWith(2, expect.stringContaining('/pull'), expect.anything());
	});
});

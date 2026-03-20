import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchOllamaModels } from './fetchOllamaModels';

vi.stubGlobal('fetch', vi.fn());

describe('fetchOllamaModels', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		delete process.env.OLLAMA_BASE_URL;
	});

	it('should fetch models from default URL', async () => {
		(fetch as any).mockResolvedValue({
			ok: true,
			json: async () => ({ models: [{ name: 'llama3' }, { name: 'mistral' }] }),
		});

		const models = await fetchOllamaModels();
		expect(fetch).toHaveBeenCalledWith('http://localhost:11434/api/tags');
		expect(models).toEqual(['llama3', 'mistral']);
	});

	it('should fetch models from custom OLLAMA_BASE_URL', async () => {
		process.env.OLLAMA_BASE_URL = 'http://1.2.3.4:11434';
		(fetch as any).mockResolvedValue({
			ok: true,
			json: async () => ({ models: [{ name: 'llama3' }] }),
		});

		const models = await fetchOllamaModels();
		expect(fetch).toHaveBeenCalledWith('http://1.2.3.4:11434/api/tags');
		expect(models).toEqual(['llama3']);
	});

	it('should return empty array if fetch fails', async () => {
		(fetch as any).mockResolvedValue({ ok: false });
		const models = await fetchOllamaModels();
		expect(models).toEqual([]);
	});

	it('should return empty array if fetch throws', async () => {
		(fetch as any).mockRejectedValue(new Error('Network error'));
		const models = await fetchOllamaModels();
		expect(models).toEqual([]);
	});
});

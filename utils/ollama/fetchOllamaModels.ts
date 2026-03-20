import { normalizeOllamaBaseUrl } from './normalizeOllamaBaseUrl';

export async function fetchOllamaModels(): Promise<string[]> {
	const ollamaBaseUrl = process.env.OLLAMA_BASE_URL
		? normalizeOllamaBaseUrl(process.env.OLLAMA_BASE_URL)
		: 'http://localhost:11434/api';
	try {
		const response = await fetch(`${ollamaBaseUrl}/tags`);
		if (!response.ok) {
			return [];
		}
		const data = await response.json() as { models: { name: string }[] };
		return data.models.map((m) => m.name);
	} catch {
		return [];
	}
}

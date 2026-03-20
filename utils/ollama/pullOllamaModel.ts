import { normalizeOllamaBaseUrl } from './normalizeOllamaBaseUrl';

export interface PullProgress {
	status: string;
	digest?: string;
	total?: number;
	completed?: number;
}

export async function pullOllamaModel(
	modelName: string,
	onProgress?: (progress: PullProgress) => void,
): Promise<void> {
	const ollamaBaseUrl = process.env.OLLAMA_BASE_URL
		? normalizeOllamaBaseUrl(process.env.OLLAMA_BASE_URL)
		: 'http://localhost:11434/api';
	const response = await fetch(`${ollamaBaseUrl}/pull`, {
		method: 'POST',
		body: JSON.stringify({ name: modelName, stream: true }),
	});

	if (!response.ok) {
		throw new Error(`Failed to pull Ollama model ${modelName}: ${response.statusText}`);
	}

	if (!response.body) {
		throw new Error(`Failed to pull Ollama model ${modelName}: No response body`);
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();

	while (true) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}

		const chunk = decoder.decode(value, { stream: true });
		const lines = chunk.split('\n');

		for (const line of lines) {
			if (!line.trim()) {
				continue;
			}

			try {
				const json = JSON.parse(line) as PullProgress;
				if (onProgress) {
					onProgress(json);
				}
			} catch {
				// Ignore parse errors for incomplete lines
			}
		}
	}
}

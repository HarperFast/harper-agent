import type { ModelProvider } from '../models/config';

export const providers: { label: string; value: ModelProvider }[] = [
	{ label: 'OpenAI', value: 'OpenAI' },
	{ label: 'Anthropic', value: 'Anthropic' },
	{ label: 'Google', value: 'Google' },
	{ label: 'Ollama', value: 'Ollama' },
];

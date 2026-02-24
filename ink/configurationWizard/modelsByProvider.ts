import type { ModelProvider } from '../models/config';

export const modelsByProvider: Record<ModelProvider, string[]> = {
	OpenAI: ['gpt-5.2', 'gpt-5.0', 'gpt-5-nano'],
	Anthropic: ['claude-4-6-opus-latest', 'claude-4-5-sonnet-latest', 'claude-4-5-haiku-latest'],
	Google: ['gemini-3-pro', 'gemini-3-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'],
	Ollama: ['qwen3-coder:30b', 'mistral', 'codellama'],
};

export const compactorModelsByProvider: Record<ModelProvider, string[]> = {
	OpenAI: modelsByProvider.OpenAI.slice().reverse(),
	Anthropic: modelsByProvider.Anthropic.slice().reverse(),
	Google: modelsByProvider.Google.slice().reverse(),
	Ollama: modelsByProvider.Ollama.slice(),
};

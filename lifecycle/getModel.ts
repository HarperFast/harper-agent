import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { aisdk } from '@openai/agents-extensions';
import { createOllama, ollama } from 'ollama-ai-provider-v2';

export function getModel(modelName: string | null, defaultModel: string = 'gpt-5.2') {
	if (!modelName || modelName === 'gpt-5.2') {
		return defaultModel;
	}

	if (modelName.startsWith('claude-')) {
		return aisdk(anthropic(modelName));
	}

	if (modelName.startsWith('gemini-')) {
		return aisdk(google(modelName));
	}

	if (modelName.startsWith('ollama-')) {
		const ollamaProvider = process.env.OLLAMA_BASE_URL
			? createOllama({ baseURL: process.env.OLLAMA_BASE_URL })
			: ollama;
		return aisdk(ollamaProvider(modelName.replace('ollama-', '')));
	}

	return aisdk(openai(modelName));
}

import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { aisdk, AiSdkModel } from '@openai/agents-extensions/ai-sdk';
import { createOllama, ollama } from 'ollama-ai-provider-v2';
import { defaultOpenAIModel } from '../agent/defaults';
import type { ModelProvider } from '../ink/models/config';
import { normalizeOllamaBaseUrl } from '../utils/ollama/normalizeOllamaBaseUrl';

export function isOpenAIModel(modelName: string): boolean {
	if (!modelName || modelName === defaultOpenAIModel) {
		return true;
	}

	return (
		!modelName.startsWith('claude-')
		&& !modelName.startsWith('gemini-')
		&& !modelName.startsWith('ollama-')
		&& !modelName.includes(':')
	);
}

export function getProvider(modelName: string): ModelProvider {
	if (modelName.startsWith('claude-')) {
		return 'Anthropic';
	}

	if (modelName.startsWith('gemini-')) {
		return 'Google';
	}

	if (modelName.startsWith('ollama-') || modelName.includes(':')) {
		return 'Ollama';
	}

	return 'OpenAI';
}

export function getModel(modelName: string): AiSdkModel {
	if (modelName.startsWith('claude-')) {
		return aisdk(anthropic(modelName));
	}

	if (modelName.startsWith('gemini-')) {
		return aisdk(google(modelName));
	}

	if (modelName.startsWith('ollama-') || modelName.includes(':')) {
		const ollamaBaseUrl = process.env.OLLAMA_BASE_URL ? normalizeOllamaBaseUrl(process.env.OLLAMA_BASE_URL) : undefined;
		const ollamaProvider = ollamaBaseUrl
			? createOllama({ baseURL: ollamaBaseUrl, compatibility: 'strict' })
			: ollama;
		return aisdk(ollamaProvider(getModelName(modelName)));
	}

	return aisdk(openai(modelName));
}

export function getModelName(modelName: string): string {
	if (modelName.startsWith('claude-')) {
		return modelName;
	}

	if (modelName.startsWith('gemini-')) {
		return modelName;
	}

	if (modelName.startsWith('ollama-')) {
		return modelName.slice(7);
	}

	return modelName;
}

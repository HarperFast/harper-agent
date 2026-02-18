import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { aisdk } from '@openai/agents-extensions';
import { AiSdkModel } from '@openai/agents-extensions/ai-sdk';
import { createOllama, ollama } from 'ollama-ai-provider-v2';
import type { ModelProvider } from '../ink/models/config';

export function isOpenAIModel(modelName: string): boolean {
	if (!modelName || modelName === 'gpt-5.2') {
		return true;
	}

	return (
		!modelName.startsWith('claude-')
		&& !modelName.startsWith('gemini-')
		&& !modelName.startsWith('ollama-')
	);
}

export function getProvider(modelName: string): ModelProvider {
	if (modelName.startsWith('claude-')) {
		return 'Anthropic';
	}

	if (modelName.startsWith('gemini-')) {
		return 'Google';
	}

	if (modelName.startsWith('ollama-')) {
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

	if (modelName.startsWith('ollama-')) {
		const ollamaBaseUrl = process.env.OLLAMA_BASE_URL ? normalizeOllamaBaseUrl(process.env.OLLAMA_BASE_URL) : undefined;
		const ollamaProvider = ollamaBaseUrl
			? createOllama({ baseURL: ollamaBaseUrl })
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
		return modelName.replace('ollama-', '');
	}

	return modelName;
}

function normalizeOllamaBaseUrl(baseUrl: string): string {
	let url = baseUrl.trim();
	if (!url.startsWith('http://') && !url.startsWith('https://')) {
		url = `http://${url}`;
	}

	const urlObj = new URL(url);
	if (!urlObj.port) {
		urlObj.port = '11434';
	}

	let pathname = urlObj.pathname;
	if (pathname.endsWith('/')) {
		pathname = pathname.slice(0, -1);
	}

	if (!pathname.endsWith('/api')) {
		pathname += '/api';
	}

	urlObj.pathname = pathname;

	return urlObj.toString().replace(/\/$/, '');
}

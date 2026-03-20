import {
	defaultAnthropicCompactionModel,
	defaultAnthropicModel,
	defaultGoogleCompactionModel,
	defaultGoogleModel,
	defaultOllamaCompactionModel,
	defaultOllamaModel,
	defaultOpenAICompactionModel,
	defaultOpenAIModel,
} from '../../agent/defaults';
import type { ModelProvider } from '../models/config';

export const modelsByProvider: Record<ModelProvider, string[]> = {
	OpenAI: [defaultOpenAIModel, 'gpt-5.0', defaultOpenAICompactionModel],
	Anthropic: [defaultAnthropicModel, 'claude-4-5-sonnet-latest', defaultAnthropicCompactionModel],
	Google: [defaultGoogleModel, 'gemini-3-flash', 'gemini-2.5-flash', defaultGoogleCompactionModel],
	Ollama: [defaultOllamaModel, 'ollama-qwen3.5:27b', defaultOllamaCompactionModel],
};

export const compactorModelsByProvider: Record<ModelProvider, string[]> = {
	OpenAI: modelsByProvider.OpenAI.slice().reverse(),
	Anthropic: modelsByProvider.Anthropic.slice().reverse(),
	Google: modelsByProvider.Google.slice().reverse(),
	Ollama: modelsByProvider.Ollama.slice().reverse(),
};

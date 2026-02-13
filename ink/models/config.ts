export type ModelProvider = 'OpenAI' | 'Anthropic' | 'Google' | 'Ollama';

export interface Config {
	provider: ModelProvider;
	apiKey?: string;
	model: string;
	compactionModel: string;
}

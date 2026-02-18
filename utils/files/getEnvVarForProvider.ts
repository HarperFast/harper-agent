import type { ModelProvider } from '../../ink/models/config';

export function getEnvVarForProvider(provider: ModelProvider) {
	switch (provider) {
		case 'Anthropic':
			return 'ANTHROPIC_API_KEY';
		case 'Google':
			return 'GOOGLE_GENERATIVE_AI_API_KEY';
		case 'OpenAI':
			return 'OPENAI_API_KEY';
		case 'Ollama':
			return 'OLLAMA_BASE_URL';
	}
}

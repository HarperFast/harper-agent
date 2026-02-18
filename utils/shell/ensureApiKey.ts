import { trackedState } from '../../lifecycle/trackedState';
import { excludeFalsy } from '../arrays/excludeFalsy';

export function ensureApiKey(): boolean {
	const models = [
		trackedState.model,
		trackedState.compactionModel,
	].filter(excludeFalsy);

	const requiredEnvVars = new Set<string>();
	for (const model of models) {
		if (model.startsWith('claude-')) {
			requiredEnvVars.add('ANTHROPIC_API_KEY');
		} else if (model.startsWith('gemini-')) {
			requiredEnvVars.add('GOOGLE_GENERATIVE_AI_API_KEY');
		} else if (model.startsWith('ollama-')) {
			// Ollama doesn't need an API key
		} else {
			requiredEnvVars.add('OPENAI_API_KEY');
		}
	}

	for (const envVar of requiredEnvVars) {
		if (!process.env[envVar]) {
			return false;
		}
	}
	return true;
}

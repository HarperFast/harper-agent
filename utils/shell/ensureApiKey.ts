import chalk from 'chalk';
import { trackedState } from '../../lifecycle/trackedState';
import { updateEnv } from '../files/updateEnv';
import { askSecureQuestion } from './askSecureQuestion';
import { harperResponse } from './harperResponse';

export async function ensureApiKey(): Promise<void> {
	const models = [
		trackedState.model || 'gpt-5.2',
		trackedState.compactionModel || 'gpt-4o-mini',
	];

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
		if (process.env[envVar]) {
			continue;
		}

		let providerName = 'OpenAI';
		let keyUrl = 'https://platform.openai.com/api-keys';

		if (envVar === 'ANTHROPIC_API_KEY') {
			providerName = 'Anthropic';
			keyUrl = 'https://console.anthropic.com/settings/keys';
		} else if (envVar === 'GOOGLE_GENERATIVE_AI_API_KEY') {
			providerName = 'Google AI';
			keyUrl = 'https://aistudio.google.com/app/apikey';
		}

		harperResponse(chalk.red(`${envVar} is not set.`));
		console.log(`To get started with ${providerName}, you'll need an API key.`);
		console.log(`1. Grab a key from ${chalk.cyan(keyUrl)}`);
		console.log(`2. Enter it below and I'll save it to your ${chalk.cyan('.env')} file.\n`);

		const key = await askSecureQuestion(`${providerName} API Key: `);
		if (!key) {
			console.log(chalk.red('No key provided. Exiting.'));
			process.exit(1);
		}

		await updateEnv(envVar, key);
		if (envVar === 'OPENAI_API_KEY') {
			await updateEnv('OPENAI_AGENTS_DISABLE_TRACING', '1');
		}

		console.log(chalk.green('API key saved successfully!\n'));
	}
}

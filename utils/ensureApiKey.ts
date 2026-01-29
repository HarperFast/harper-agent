import chalk from 'chalk';
import { askSecureQuestion } from './askSecureQuestion.ts';
import { harperResponse } from './harperResponse.ts';
import { updateEnv } from './updateEnv.ts';

export async function ensureApiKey(): Promise<void> {
	if (!process.env['OPENAI_API_KEY']) {
		harperResponse(chalk.red('OPENAI_API_KEY is not set.'));
		console.log(`To get started, you'll need an OpenAI API key.`);
		console.log(`1. Grab a key from ${chalk.cyan('https://platform.openai.com/api-keys')}`);
		console.log(`2. Enter it below and I'll save it to your ${chalk.cyan('.env')} file.\n`);

		const key = await askSecureQuestion('OpenAI API Key: ');
		if (!key) {
			console.log(chalk.red('No key provided. Exiting.'));
			process.exit(1);
		}

		await updateEnv('OPENAI_API_KEY', key);
		await updateEnv('OPENAI_AGENTS_DISABLE_TRACING', '1');

		console.log(chalk.green('API key saved successfully!\n'));
	}
}

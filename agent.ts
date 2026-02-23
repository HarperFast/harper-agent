#!/usr/bin/env node
import chalk from 'chalk';
import { agentManager } from './agent/AgentManager';
import { emitToListeners } from './ink/emitters/listener';
import { bootstrapConfig, bootstrapMain } from './ink/main';
import { handleExit } from './lifecycle/handleExit';
import { parseArgs } from './lifecycle/parseArgs';
import { loadEnv } from './utils/envLoader';
import { setupGlobalErrorHandlers } from './utils/logger';
import { checkForUpdate } from './utils/package/checkForUpdate';
import { ensureApiKey } from './utils/shell/ensureApiKey';
import { getStdin } from './utils/shell/getStdin';

(async function() {
	setupGlobalErrorHandlers();
	loadEnv();

	process.on('SIGINT', handleExit);
	process.on('SIGTERM', handleExit);

	await checkForUpdate();

	parseArgs();
	if (!ensureApiKey()) {
		await new Promise(resolve => {
			bootstrapConfig(resolve);
		});
		emitToListeners('ExitUI', undefined);
		parseArgs();
		if (!ensureApiKey()) {
			console.log(chalk.red('No key provided. Exiting.'));
			process.exit(1);
		}
	}

	await agentManager.initialize();
	bootstrapMain();

	getStdin().then((stdinPrompt) => {
		if (stdinPrompt?.trim?.()?.length) {
			emitToListeners('PushNewMessages', [
				{ type: 'user', text: stdinPrompt.trim(), version: 1 },
			]);
		}
	});
})();

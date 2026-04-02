#!/usr/bin/env node
import './lifecycle/patchFetch';
import chalk from 'chalk';
import { agentManager } from './agent/AgentManager';
import { emitToListeners } from './ink/emitters/listener';
import { bootstrapConfig, bootstrapMain } from './ink/main';
import { handleExit } from './lifecycle/handleExit';
import { parseArgs } from './lifecycle/parseArgs';
import { resetTrackedState } from './lifecycle/trackedState';
import { loadEnv } from './utils/envLoader';
import { setupGlobalErrorHandlers } from './utils/logger';
import { checkForUpdate } from './utils/package/checkForUpdate';
import { ensureApiKey } from './utils/shell/ensureApiKey';

(async function() {
	setupGlobalErrorHandlers();
	loadEnv();

	process.on('SIGINT', handleExit);
	process.on('SIGTERM', handleExit);

	await checkForUpdate();

	parseArgs();
	if (!ensureApiKey()) {
		resetTrackedState();
		await bootstrapConfig();
		emitToListeners('ExitUI', undefined);
		parseArgs();
		if (!ensureApiKey()) {
			console.log(chalk.red('No key provided. Exiting.'));
			process.exit(1);
		}
	}

	await agentManager.initialize();
	bootstrapMain();
})();

#!/usr/bin/env node
import chalk from 'chalk';
import { agentManager } from './agent/AgentManager';
import { emitToListeners } from './ink/emitters/listener';
import { bootstrapConfig, bootstrapMain } from './ink/main';
import { handleExit } from './lifecycle/handleExit';
import { parseArgs } from './lifecycle/parseArgs';
import { trackedState } from './lifecycle/trackedState';
import { loadEnv } from './utils/envLoader';
import { setupGlobalErrorHandlers } from './utils/logger';
import { checkForUpdate } from './utils/package/checkForUpdate';
import { rateLimitTracker } from './utils/sessions/rateLimits';
import { ensureApiKey } from './utils/shell/ensureApiKey';

(async function() {
	setupGlobalErrorHandlers();
	loadEnv();

	// Intercept fetch to monitor rate limit headers
	const originalFetch = globalThis.fetch;
	globalThis.fetch = async (...args) => {
		const response = await originalFetch(...args);
		const headers: Record<string, string> = {};
		response.headers.forEach((value, key) => {
			headers[key] = value;
		});
		rateLimitTracker.updateFromHeaders(headers);
		emitToListeners('SettingsUpdated', undefined);
		return response;
	};

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

	if (trackedState.prompt?.trim?.()?.length) {
		trackedState.autonomous = true;
		emitToListeners('PushNewMessages', [
			{ type: 'prompt', text: trackedState.prompt.trim(), version: 1 },
		]);
	}
})();

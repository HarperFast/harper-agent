#!/usr/bin/env node
import 'dotenv/config';
import chalk from 'chalk';
import { agentManager } from './agent/AgentManager';
import { emitToListeners } from './ink/emitters/listener';
import { bootstrapConfig, bootstrapMain } from './ink/main';
import { handleExit } from './lifecycle/handleExit';
import { parseArgs } from './lifecycle/parseArgs';
import { ensureApiKey } from './utils/shell/ensureApiKey';
import { getStdin } from './utils/shell/getStdin';

(async function() {
	process.on('SIGINT', handleExit);
	process.on('SIGTERM', handleExit);

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

	// TODO: Shift into the UI, less abrasive.
	//       await checkForUpdate();

	// TODO:
	// 	  const pkg = getOwnPackageJson();
	// 	  const packageVersion = pkg.version;
	// 	  const harperAppExists = existsSync(join(trackedState.cwd, 'config.yaml'));
	// 	  console.log(chalk.dim(`Version: ${chalk.cyan(packageVersion)}`) + ` ${chalk.redBright('ALPHA')}`);
	// 	  console.log(chalk.dim(`Working directory: ${chalk.cyan(trackedState.cwd)}`));
	// 	  console.log(chalk.dim(`Harper app detected: ${chalk.cyan(harperAppExists ? 'Yes' : 'No')}`));

	agentManager.initialize();
	bootstrapMain();

	getStdin().then((stdinPrompt) => {
		if (stdinPrompt?.trim?.()?.length) {
			emitToListeners('PushNewMessages', [{ type: 'user', text: stdinPrompt }]);
		}
	});
})();

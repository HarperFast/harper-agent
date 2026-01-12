#!/usr/bin/env /Users/dawson/.nvm/versions/node/v24.11.1/bin/node
import 'dotenv/config';
import { Agent, MemorySession, run } from '@openai/agents';
import chalk from 'chalk';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createTools } from './tools/factory.ts';
import { askQuestion } from './utils/askQuestion.ts';
import { cleanUpAndSayBye } from './utils/cleanUpAndSayBye.ts';
import { harperResponse } from './utils/harperResponse.ts';
import { spinner } from './utils/spinner.ts';

async function main() {
	if (!process.env['OPENAI_API_KEY']) {
		harperResponse(chalk.red('Error: OPENAI_API_KEY is not set.'));
		console.log(`Please set it in your environment or in a ${chalk.cyan('.env')} file.`);
		process.exit(1);
	}

	const workspaceRoot = process.cwd();
	const harperAppExists = existsSync(join(workspaceRoot, 'config.yaml'));

	console.log(chalk.dim(`Working directory: ${chalk.cyan(workspaceRoot)}`));
	console.log(chalk.dim(`Harper app detected in it: ${chalk.cyan(harperAppExists ? 'Yes' : 'No')}`));
	console.log(chalk.dim(`Press Ctrl+C or hit enter twice to exit.\n`));

	const vibing = harperAppExists ? 'updating' : 'creating';
	const agent = new Agent({
		name: 'Harper App Development Assistant',
		model: 'gpt-5.2',
		instructions: `You are working on ${vibing} the harper app in ${workspaceRoot} with the user.`,
		tools: createTools(),
	});

	harperResponse(
		harperAppExists
			? 'What do you want to do together today?'
			: 'What kind of Harper app do you want to make together?',
	);

	const session = new MemorySession();
	let emptyLines = 0;

	while (true) {
		const task = await askQuestion('> ');
		if (!task) {
			emptyLines += 1;
			if (emptyLines >= 2) {
				cleanUpAndSayBye();
				process.exit(0);
			}
			continue;
		}
		emptyLines = 0;

		process.stdout.write('\n');
		spinner.start();

		const stream = await run(
			agent,
			task,
			{
				session,
				stream: true,
			},
		);

		let hasStartedResponse = false;
		let atStartOfLine = true;

		for await (const event of stream) {
			switch (event.type) {
				case 'raw_model_stream_event':
					const data = event.data;
					switch (data.type) {
						case 'response_started':
							if (!atStartOfLine) {
								process.stdout.write('\n');
								atStartOfLine = true;
							}
							spinner.start();
							break;
						case 'output_text_delta':
							spinner.stop();
							if (!hasStartedResponse) {
								process.stdout.write(`${chalk.bold('Harper:')} `);
								hasStartedResponse = true;
							}
							process.stdout.write(chalk.cyan(data.delta));
							atStartOfLine = data.delta.endsWith('\n');
							break;
						case 'response_done':
							spinner.stop();
							atStartOfLine = true;
							break;
					}
					break;
				case 'agent_updated_stream_event':
					spinner.stop();
					console.log(`\n${chalk.magenta('👤')} ${chalk.bold('Agent switched to:')} ${chalk.italic(event.agent.name)}`);
					atStartOfLine = true;
					spinner.start();
					break;
				case 'run_item_stream_event':
					if (event.name === 'tool_called') {
						spinner.stop();
						const item = event.item.rawItem ?? event.item;
						const name = item.name || item.type || 'tool';
						const args: string = typeof item.arguments === 'string'
							? item.arguments
							: item.arguments
							? JSON.stringify(item.arguments)
							: '';
						const displayedArgs = args ? `(${args.slice(0, 50)}${args.length > 50 ? '...' : ''})` : '()';
						console.log(`\n${chalk.yellow('🛠️')}  ${chalk.cyan(name)}${chalk.dim(displayedArgs)}`);
						atStartOfLine = true;
						spinner.start();
					}
					break;
			}
		}
		spinner.stop();
		if (!atStartOfLine || hasStartedResponse) {
			process.stdout.write('\n\n');
		}
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});

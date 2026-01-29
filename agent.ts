#!/usr/bin/env /Users/dawson/.nvm/versions/node/v24.11.1/bin/node
import 'dotenv/config';
import { Agent, MemorySession, OpenAIResponsesCompactionSession, run } from '@openai/agents';
import chalk from 'chalk';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createTools } from './tools/factory.ts';
import { askQuestion } from './utils/askQuestion.ts';
import { checkForUpdate } from './utils/checkForUpdate.ts';
import { cleanUpAndSayBye } from './utils/cleanUpAndSayBye.ts';
import { costTracker } from './utils/cost.ts';
import { ensureApiKey } from './utils/ensureApiKey.ts';
import { harperResponse } from './utils/harperResponse.ts';
import { spinner } from './utils/spinner.ts';

const argumentTruncationPoint = 100;

async function main() {
	await checkForUpdate();
	await ensureApiKey();

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
		modelSettings: {
			providerData: {
				service_tier: 'flex',
			},
		},
	});

	harperResponse(
		harperAppExists
			? 'What do you want to do together today?'
			: 'What kind of Harper app do you want to make together?',
	);

	let atStartOfLine = true;
	const session = new OpenAIResponsesCompactionSession({
		underlyingSession: new MemorySession(),
		model: 'gpt-4o-mini',
	}) as OpenAIResponsesCompactionSession & {
		runCompaction: typeof OpenAIResponsesCompactionSession.prototype.runCompaction;
	};

	const originalRunCompaction = session.runCompaction.bind(session);
	session.runCompaction = async (args) => {
		const originalMessage = spinner.message;
		spinner.message = 'Compacting conversation history...';
		const wasSpinning = spinner.isSpinning;
		if (!wasSpinning) {
			if (!atStartOfLine) {
				process.stdout.write('\n');
				atStartOfLine = true;
			}
			await new Promise((resolve) => setTimeout(resolve, 50));
			spinner.start();
		}
		try {
			return await originalRunCompaction(args);
		} finally {
			if (!wasSpinning) {
				spinner.stop();
			}
			spinner.message = originalMessage;
		}
	};
	let emptyLines = 0;
	let approvalState: any | null = null;

	let controller: AbortController | null = null;

	spinner.interrupt = () => {
		if (controller) {
			spinner.stop();
			controller.abort();
			harperResponse('<thought interrupted>');
			atStartOfLine = true;
		}
	};

	while (true) {
		let task: string = '';

		controller = new AbortController();
		const signal = controller.signal;

		if (!approvalState) {
			task = await askQuestion('> ');
			if (!task) {
				emptyLines += 1;
				if (emptyLines >= 2) {
					costTracker.logFinalStats();
					cleanUpAndSayBye();
					break;
				}
				continue;
			}
			emptyLines = 0;

			process.stdout.write('\n');
		}

		spinner.start();
		try {
			const stream = await run(agent, approvalState ?? task, {
				session,
				stream: true,
				signal,
				maxTurns: 30,
			});
			approvalState = null;

			let hasStartedResponse = false;
			atStartOfLine = true;

			for await (const event of stream) {
				spinner.status = costTracker.getStatusString(stream.state.usage, String(agent.model));

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
						console.log(
							`\n${chalk.magenta('👤')} ${chalk.bold('Agent switched to:')} ${chalk.italic(event.agent.name)}`,
						);
						atStartOfLine = true;
						spinner.start();
						break;
					case 'run_item_stream_event':
						if (event.name === 'tool_called') {
							spinner.stop();
							const item = event.item.rawItem ?? event.item;
							const name = item.name || item.type || 'tool';
							let args: string = typeof item.arguments === 'string'
								? item.arguments
								: item.arguments
								? JSON.stringify(item.arguments)
								: '';

							if (!args && item.type === 'shell_call' && item.action?.commands) {
								args = JSON.stringify(item.action.commands);
							}

							if (!args && item.type === 'apply_patch_call' && item.operation) {
								args = JSON.stringify(item.operation);
							}

							const displayedArgs = args
								? `(${args.slice(0, argumentTruncationPoint)}${args.length > argumentTruncationPoint ? '...' : ''})`
								: '()';
							console.log(`\n${chalk.yellow('🛠️')}  ${chalk.cyan(name)}${chalk.dim(displayedArgs)}`);
							atStartOfLine = true;
							spinner.start();
						}
						break;
				}

				if (stream.interruptions?.length) {
					for (const interruption of stream.interruptions) {
						if (interruption.rawItem.type !== 'function_call') {
							throw new Error(
								'Invalid interruption type: ' + interruption.rawItem.type,
							);
						}

						spinner.stop();

						console.log(
							chalk.bold.bgYellow.black('\nTool approval required (see above):'),
						);

						const answer = await askQuestion(`\tProceed? [y/N] `);
						const approved = answer.trim().toLowerCase();

						spinner.start();

						const ok = approved === 'y' || approved === 'yes' || approved === 'ok' || approved === 'k';
						if (ok) {
							stream.state.approve(interruption);
						} else {
							stream.state.reject(interruption);
						}
					}
					approvalState = stream.state;
					break;
				}
			}
			spinner.stop();
			if (!atStartOfLine || hasStartedResponse) {
				process.stdout.write('\n\n');
			}

			if (!approvalState) {
				costTracker.recordTurn(String(agent.model), stream.state.usage);
			}
		} catch (error: any) {
			spinner.stop();
			process.stdout.write('\n');
			harperResponse(chalk.red(`Error: ${error.message || error}`));
			atStartOfLine = true;
			approvalState = null;
		}
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});

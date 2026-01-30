#!/usr/bin/env node
import 'dotenv/config';
import { Agent, MemorySession, OpenAIResponsesCompactionSession, run } from '@openai/agents';
import chalk from 'chalk';
import { getModel } from './lifecycle/getModel';
import { parseArgs } from './lifecycle/parseArgs';
import { sayHi } from './lifecycle/sayHi';
import { trackCompaction } from './lifecycle/trackCompaction';
import { trackedState } from './lifecycle/trackedState';
import { createTools } from './tools/factory';
import { askQuestion } from './utils/askQuestion';
import { checkForUpdate } from './utils/checkForUpdate';
import { cleanUpAndSayBye } from './utils/cleanUpAndSayBye';
import { costTracker } from './utils/cost';
import { ensureApiKey } from './utils/ensureApiKey';
import { harperResponse } from './utils/harperResponse';
import { spinner } from './utils/spinner';

const argumentTruncationPoint = 100;

async function main() {
	await checkForUpdate();
	parseArgs();
	await ensureApiKey();

	const { name, instructions } = sayHi();

	const agent = new Agent({
		name,
		model: getModel(trackedState.model),
		instructions,
		tools: createTools(),
		modelSettings: {
			providerData: {
				service_tier: 'flex',
			},
		},
	});
	const session = new OpenAIResponsesCompactionSession({
		underlyingSession: new MemorySession(),
		model: getModel(trackedState.compactionModel, 'gpt-4o-mini') as any, // TODO: Not sure if non-OpenAI models will work...
	}) as OpenAIResponsesCompactionSession & {
		runCompaction: typeof OpenAIResponsesCompactionSession.prototype.runCompaction;
	};
	trackCompaction(session);

	while (true) {
		let task: string = '';

		trackedState.controller = new AbortController();

		if (!trackedState.approvalState) {
			task = await askQuestion('> ');
			if (!task) {
				trackedState.emptyLines += 1;
				if (trackedState.emptyLines >= 2) {
					costTracker.logFinalStats();
					cleanUpAndSayBye();
					break;
				}
				continue;
			}
			trackedState.emptyLines = 0;

			process.stdout.write('\n');
		}

		spinner.start();
		try {
			const stream = await run(agent, trackedState.approvalState ?? task, {
				session,
				stream: true,
				signal: trackedState.controller.signal,
				maxTurns: 30,
			});
			trackedState.approvalState = null;

			let hasStartedResponse = false;
			trackedState.atStartOfLine = true;

			for await (const event of stream) {
				spinner.status = costTracker.getStatusString(
					stream.state.usage,
					trackedState.model || 'gpt-5.2',
					trackedState.compactionModel || 'gpt-4o-mini',
				);

				switch (event.type) {
					case 'raw_model_stream_event':
						const data = event.data;
						switch (data.type) {
							case 'response_started':
								if (!trackedState.atStartOfLine) {
									process.stdout.write('\n');
									trackedState.atStartOfLine = true;
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
								trackedState.atStartOfLine = data.delta.endsWith('\n');
								break;
							case 'response_done':
								spinner.stop();
								trackedState.atStartOfLine = true;
								break;
						}
						break;
					case 'agent_updated_stream_event':
						spinner.stop();
						console.log(
							`\n${chalk.magenta('👤')} ${chalk.bold('Agent switched to:')} ${chalk.italic(event.agent.name)}`,
						);
						trackedState.atStartOfLine = true;
						spinner.start();
						break;
					case 'run_item_stream_event':
						if (event.name === 'tool_called') {
							spinner.stop();
							const item: any = event.item.rawItem ?? event.item;
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
							trackedState.atStartOfLine = true;
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
					trackedState.approvalState = stream.state;
					break;
				}
			}
			spinner.stop();
			if (!trackedState.atStartOfLine || hasStartedResponse) {
				process.stdout.write('\n\n');
			}

			if (!trackedState.approvalState) {
				costTracker.recordTurn(
					trackedState.model || 'gpt-5.2',
					stream.state.usage,
					trackedState.compactionModel || 'gpt-4o-mini',
				);
			}
		} catch (error: any) {
			spinner.stop();
			process.stdout.write('\n');
			harperResponse(chalk.red(`Error: ${error.message || error}`));
			trackedState.atStartOfLine = true;
			trackedState.approvalState = null;
		}
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});

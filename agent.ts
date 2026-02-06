#!/usr/bin/env node
import 'dotenv/config';
import { Agent, run } from '@openai/agents';
import chalk from 'chalk';
import { cleanUpAndSayBye } from './lifecycle/cleanUpAndSayBye';
import { defaultInstructions } from './lifecycle/defaultInstructions';
import { getModel, isOpenAIModel } from './lifecycle/getModel';
import { parseArgs } from './lifecycle/parseArgs';
import { readAgentsMD } from './lifecycle/readAgentsMD';
import { sayHi } from './lifecycle/sayHi';
import { trackedState } from './lifecycle/trackedState';
import { createTools } from './tools/factory';
import { checkForUpdate } from './utils/package/checkForUpdate';
import { costTracker } from './utils/sessions/cost';
import { modelSettings } from './utils/sessions/modelSettings';
import { askQuestion } from './utils/shell/askQuestion';
import { ensureApiKey } from './utils/shell/ensureApiKey';
import { harperResponse } from './utils/shell/harperResponse';
import { spinner } from './utils/shell/spinner';

import { handleExit } from './lifecycle/handleExit';
import { createSession } from './utils/sessions/createSession';

const argumentTruncationPoint = 100;

process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);

async function main() {
	process.on('SIGINT', async () => {
		await cleanUpAndSayBye();
		process.exit(0);
	});

	await checkForUpdate();
	parseArgs();
	await ensureApiKey();

	sayHi();

	const agent = trackedState.agent = new Agent({
		name: 'Harper App Development Assistant',
		model: isOpenAIModel(trackedState.model) ? trackedState.model : getModel(trackedState.model),
		modelSettings,
		instructions: readAgentsMD() || defaultInstructions(),
		tools: createTools(),
	});

	const session = createSession(trackedState.sessionPath);

	while (true) {
		let task: string = '';
		// Track the last tool call so we can include context if an error happens
		let lastToolCallInfo: string | null = null;

		trackedState.controller = new AbortController();

		if (!trackedState.approvalState) {
			task = await askQuestion('> ');
			if (!task) {
				trackedState.emptyLines += 1;
				if (trackedState.emptyLines >= 2) {
					return handleExit();
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
								const tier = (data as any).response?.providerData?.service_tier
									|| (data as any).providerData?.service_tier;
								if (tier) {
									(stream.state.usage as any).serviceTier = tier;
									const entries = stream.state.usage.requestUsageEntries;
									if (entries && entries.length > 0) {
										(entries[entries.length - 1] as any).serviceTier = tier;
									}
								}
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
							// Save context for potential error reporting later
							lastToolCallInfo = `${name}${displayedArgs}`;
							trackedState.atStartOfLine = true;
							if (!stream.interruptions?.length) {
								spinner.start();
							}
						}
						break;
				}

				spinner.status = costTracker.getStatusString(
					stream.state.usage,
					trackedState.model || 'gpt-5.2',
					trackedState.compactionModel || 'gpt-4o-mini',
				);

				// No break here - let the stream finish naturally so we can capture all events
				// and potential multiple interruptions in one turn.
			}

			if (stream.interruptions?.length) {
				for (const interruption of stream.interruptions) {
					spinner.stop();

					console.log(
						chalk.bold.bgYellow.black('\nTool approval required (see above):'),
					);

					const answer = await askQuestion(`\tProceed? [y/N] `);
					const approved = answer.trim().toLowerCase();

					const ok = approved === 'y' || approved === 'yes' || approved === 'ok' || approved === 'k';
					if (ok) {
						stream.state.approve(interruption);
					} else {
						stream.state.reject(interruption);
					}
				}
				trackedState.approvalState = stream.state;
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
			// Build a detailed error report to help diagnosis and allow the LLM/user to recover.
			const err: any = error ?? {};
			const name = err.name || 'Error';
			const message: string = err.message || String(err);
			const code = err.code ? ` code=${err.code}` : '';
			const status = err.status || err.statusCode || err.response?.status;
			const statusStr = status ? ` status=${status}` : '';
			const callIdMatch = message.match(/function call\s+(call_[A-Za-z0-9_-]+)/i);
			const callId = callIdMatch?.[1];
			const isNoToolOutput = /No tool output found for function call/i.test(message || '');
			const hint = isNoToolOutput
				? `\nHint: A tool likely threw or returned no result. Ensure tools always return a structured object (e.g., { status, output }) and never throw. If this followed a tool call${
					callId ? ` (${callId})` : ''
				}${lastToolCallInfo ? `: ${lastToolCallInfo}` : ''}, review that tool's implementation and logs.`
				: '';
			// Include response data if present but keep it short
			let responseDataSnippet = '';
			const data = err.response?.data ?? err.data;
			if (data) {
				try {
					const s = typeof data === 'string' ? data : JSON.stringify(data);
					responseDataSnippet = `\nResponse data: ${s.slice(0, 500)}${s.length > 500 ? '…' : ''}`;
				} catch {}
			}
			const stack = err.stack ? `\nStack: ${String(err.stack).split('\n').slice(0, 8).join('\n')}` : '';
			const lastTool = lastToolCallInfo ? `\nLast tool call: ${lastToolCallInfo}` : '';
			const composed = `${name}:${code}${statusStr} ${message}${hint}${lastTool}${responseDataSnippet}${stack}`;
			harperResponse(chalk.red(composed));
			trackedState.atStartOfLine = true;
			trackedState.approvalState = null;
		}
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});

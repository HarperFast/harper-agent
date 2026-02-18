import { tool } from '@openai/agents';
import chalk from 'chalk';
import { z } from 'zod';
import { mentionsIgnoredPath } from '../../utils/files/mentionsIgnoredPath';
import { getEnv } from '../../utils/getEnv';
import { isRiskyCommand } from '../../utils/shell/isRiskyCommand';
import { LocalShell } from '../../utils/shell/LocalShell';

const ShellParameters = z.object({
	commands: z.array(z.string()).describe('The commands to execute.'),
});

const shell = new LocalShell();

export const shellTool = tool({
	name: 'shell',
	description: 'Executes shell commands. Only use when we do not have a better tool.',
	parameters: ShellParameters,
	execute: async ({ commands }) => {
		/*
			TODO: seeking approval
			TODO: approval denied
			TODO: running
			TODO: done w/exit code
			if (name === 'shell' || name === 'shell_call') {
								this.shellCommandCount++;
								emitToListeners('AddShellCommand', {
									command: name,
									args: args,
									running: true,
								});
							}
						} else if (event.name === 'tool_output') {
							const item: any = event.item.rawItem ?? event.item;
							const name = item.name || item.type || 'tool';

							if (name === 'shell' || name === 'shell_call' || name === 'shell_call_output') {
								const result: any = (event.item as any).output;
								let exitCode = 0;
								if (typeof result === 'string') {
									const exitCodeMatch = result.match(/EXIT CODE: (\d+)/);
									if (exitCodeMatch) {
										exitCode = parseInt(exitCodeMatch[1]!, 10);
									}
								}

								emitToListeners('UpdateShellCommand', {
									id: this.shellCommandCount - 1,
									running: false,
									exitCode: exitCode,
								});
							}
		 */

		const result = await shell.run({ commands });
		return result.output.map((o) => {
			let out = `STDOUT:\n${o.stdout}\nSTDERR:\n${o.stderr}`;
			if (o.outcome.type === 'exit') {
				out += `\nEXIT CODE: ${o.outcome.exitCode}`;
			} else {
				out += `\nTIMEOUT`;
			}
			return out;
		}).join('\n---\n');
	},
	needsApproval: async (runContext, { commands }, callId) => {
		if (callId && runContext.isToolApproved({ toolName: 'shell', callId })) {
			return false;
		}

		const foundRiskyCommand = commands.find((command) => isRiskyCommand(command));
		const foundIgnoredInteraction = commands.find((command) => mentionsIgnoredPath(command));

		const autoApproved = getEnv('HARPER_AGENT_AUTO_APPROVE_SHELL', 'SHELL_AUTO_APPROVE') === '1' && !foundRiskyCommand
			&& !foundIgnoredInteraction;

		if (autoApproved) {
			console.log(
				chalk.bold.bgGreen.black('\n Shell command (auto-approved): \n'),
			);
		} else if (foundRiskyCommand) {
			console.log(
				chalk.bold.bgYellow.black('\n Shell command approval of risky command required: \n'),
			);
		} else if (foundIgnoredInteraction) {
			console.log(
				chalk.bold.bgYellow.black('\n Shell command approval of ignored file interaction required: \n'),
			);
		} else {
			console.log(
				chalk.bold.bgYellow.black('\n Shell command approval required: \n'),
			);
		}

		for (const cmd of commands) {
			console.log(chalk.dim(`  > ${cmd}`));
		}

		return !autoApproved;
	},
});

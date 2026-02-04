import { tool } from '@openai/agents';
import chalk from 'chalk';
import { z } from 'zod';
import { mentionsIgnoredPath } from '../../utils/files/mentionsIgnoredPath';
import { isRiskyCommand } from '../../utils/shell/isRiskyCommand';
import { LocalShell } from '../../utils/shell/LocalShell';
import { spinner } from '../../utils/shell/spinner';

const ShellParameters = z.object({
	commands: z.array(z.string()).describe('The commands to execute.'),
});

const shell = new LocalShell();

export const shellTool = tool({
	name: 'shellToolForCommandsWithoutABetterTool',
	description: 'Executes shell commands.',
	parameters: ShellParameters,
	execute: async ({ commands }) => {
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

		const autoApproved = process.env.SHELL_AUTO_APPROVE === '1' && !foundRiskyCommand && !foundIgnoredInteraction;

		spinner.stop();
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

		if (autoApproved) {
			spinner.start();
		}

		return !autoApproved;
	},
});

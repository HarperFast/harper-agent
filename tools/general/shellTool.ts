import { tool } from '@openai/agents';
import chalk from 'chalk';
import { z } from 'zod';
import { emitToListeners } from '../../ink/emitters/listener';
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

		// TODO:
		//   if (autoApproved) {
		//   	console.log(
		//   		chalk.bold.bgGreen.black('\n Shell command (auto-approved): \n'),
		//   	);
		//   } else if (foundRiskyCommand) {
		//   	console.log(
		//   		chalk.bold.bgYellow.black('\n Shell command approval of risky command required: \n'),
		//   	);
		//   } else if (foundIgnoredInteraction) {
		//   	console.log(
		//   		chalk.bold.bgYellow.black('\n Shell command approval of ignored file interaction required: \n'),
		//   	);
		//   } else {
		//   	console.log(
		//   		chalk.bold.bgYellow.black('\n Shell command approval required: \n'),
		//   	);
		//   }
		//   for (const cmd of commands) {
		//   	console.log(chalk.dim(`  > ${cmd}`));
		//   }

		return !autoApproved;
	},
});

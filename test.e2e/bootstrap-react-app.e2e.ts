import 'dotenv/config';
import { Agent, run } from '@openai/agents';
import { beforeAll, describe, expect, test } from 'vitest';
import { getModel, isOpenAIModel } from '../lifecycle/getModel';
import { parseArgs } from '../lifecycle/parseArgs';
import { trackedState } from '../lifecycle/trackedState';
import { createSession } from '../utils/sessions/createSession';
import { modelSettings } from '../utils/sessions/modelSettings';
import { Chat } from './utils/chat';

describe('End-to-End Tests', () => {
	const chat = new Chat();
	const youArePretendingToBeADev =
		'You are pretending to be a human chatting with the Hairper coding agent to create your next great app. ';
	const instructHairper =
		'Form your messages as short, simple instructions of what you want Hairper to do for you. It will do the coding work. ';

	beforeAll(() => parseArgs());

	test(
		'creates a simple react app',
		async () => {
			const messages = chat.bootstrap();
			// Wait for the initial CLI prompt before sending the instruction
			await messages.next();
			chat.sendLine('I want to make a react app that shows the current time in really big letters. Really simple.');

			const ok = await chat.waitForFiles(60_000, (files: string[]) => {
				const pkgJson = files.some(a => a.endsWith('package.json'));
				const gitDir = files.some(a => a.includes('.git/'));
				const appFile = files.some(a => (a.endsWith('App.tsx') || a.endsWith('App.jsx')));
				return pkgJson && gitDir && appFile;
			});

			chat.stop();

			expect(ok, `Expected files to be created. CLI output so far:\n${chat.stdoutBuf}`).toBe(true);
		},
		60_000,
	);

	test(
		'can guide the user through simple questions',
		async () => {
			const messages = chat.bootstrap();
			const instructions = youArePretendingToBeADev + instructHairper
				+ 'You want to create a React TypeScript app that flips coins as a game.';

			const human = new Agent({
				name: 'Developer',
				model: isOpenAIModel(trackedState.model) ? trackedState.model : getModel(trackedState.model),
				modelSettings,
				instructions,
			});
			const session = createSession(trackedState.compactionModel, trackedState.sessionPath);

			let interactionsRemaining = 3;

			for await (const message of messages) {
				console.log('Human: Thinking...');
				const response = await run(
					human,
					message,
					{ session },
				);

				if (response.finalOutput) {
					chat.sendLine(response.finalOutput.replace(/\r+/g, ' ').replace(/\n+/g, ' '));
				}
				console.log('interactionsRemaining: ' + interactionsRemaining);
				if (--interactionsRemaining <= 0) {
					chat.stop();
					break;
				}
				console.log('Hairper: Thinking...');
			}

			const response = await run(
				human,
				'Do you think Hairper was successful in accomplishing your goal? Either respond with the string "yes" (without quotes around it) and nothing else, or a detailed error description.',
				{ session },
			);
			expect(response.finalOutput).toBe('yes');
		},
		5 * 60_000,
	);
});

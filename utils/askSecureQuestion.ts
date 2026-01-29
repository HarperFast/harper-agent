import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { cleanUpAndSayBye } from './cleanUpAndSayBye.ts';
import { costTracker } from './cost.ts';

export async function askSecureQuestion(query: string): Promise<string> {
	let muted = false;
	const mutableStdout = new Writable({
		write: function(chunk, encoding, callback) {
			if (!muted) {
				process.stdout.write(chunk, encoding);
			}
			callback();
		},
	});

	const rl = createInterface({
		input: process.stdin,
		output: mutableStdout,
		terminal: true,
	});

	rl.on('SIGINT', () => {
		costTracker.logFinalStats();
		cleanUpAndSayBye();
		rl.close();
		process.exit(0);
	});

	try {
		const responsePromise = rl.question(query);
		muted = true;
		const response = await responsePromise;
		muted = false;
		console.log('');
		return response;
	} finally {
		rl.close();
	}
}

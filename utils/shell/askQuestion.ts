import { createInterface } from 'node:readline/promises';
import { handleExit } from '../../lifecycle/handleExit';

export async function askQuestion(query: string): Promise<string> {
	const rl = createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	rl.on('SIGINT', handleExit);

	try {
		const response = await rl.question(query);
		console.log('');
		return response;
	} finally {
		rl.close();
	}
}

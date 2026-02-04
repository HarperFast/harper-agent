import { cleanUpAndSayBye } from './cleanUpAndSayBye';

export async function handleExit() {
	await cleanUpAndSayBye();
	process.exit(0);
}

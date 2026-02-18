import { getGlobalTraceProvider } from '@openai/agents';
import { costTracker } from '../utils/sessions/cost';
import { harperProcess } from '../utils/shell/harperProcess';
import { harperResponse } from '../utils/shell/harperResponse';

export async function cleanUpAndSayBye() {
	costTracker.logFinalStats();
	if (harperProcess.startedInternally) {
		harperProcess.stop();
	}
	console.log('');
	harperResponse('See you later!');
	await getGlobalTraceProvider().forceFlush();
}

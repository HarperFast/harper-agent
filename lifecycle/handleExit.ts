import { getGlobalTraceProvider } from '@openai/agents';
import { emitToListeners } from '../ink/emitters/listener';
import { costTracker } from '../utils/sessions/cost';
import { harperProcess } from '../utils/shell/harperProcess';

export async function handleExit() {
	costTracker.logFinalStats();
	if (harperProcess.startedInternally) {
		harperProcess.stop();
	}
	await getGlobalTraceProvider().forceFlush();
	emitToListeners('ExitUI', undefined);
	process.exit(0);
}

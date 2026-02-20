import { getGlobalTraceProvider } from '@openai/agents';
import { emitToListeners } from '../ink/emitters/listener';
import { harperProcess } from '../utils/shell/harperProcess';

export async function handleExit() {
	if (harperProcess.startedInternally) {
		harperProcess.stop();
	}
	await getGlobalTraceProvider().forceFlush();
	emitToListeners('ExitUI', undefined);
	process.exit(0);
}

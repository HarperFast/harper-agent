import { costTracker } from '../utils/sessions/cost';
import { spinner } from '../utils/shell/spinner';
import { cleanUpAndSayBye } from './cleanUpAndSayBye';

export function handleExit() {
	spinner.stop();
	costTracker.logFinalStats();
	cleanUpAndSayBye();
	process.exit(0);
}

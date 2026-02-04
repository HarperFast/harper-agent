import { costTracker } from '../utils/sessions/cost';
import { harperProcess } from '../utils/shell/harperProcess';
import { harperResponse } from '../utils/shell/harperResponse';
import { spinner } from '../utils/shell/spinner';

export async function cleanUpAndSayBye() {
	spinner.stop();
	costTracker.logFinalStats();
	if (harperProcess.startedByHairper) {
		harperProcess.stop();
	}
	console.log('');
	harperResponse('See you later!');
}

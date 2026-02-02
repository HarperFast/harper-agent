import { harperProcess } from '../utils/shell/harperProcess';
import { harperResponse } from '../utils/shell/harperResponse';

export function cleanUpAndSayBye() {
	if (harperProcess.startedByHairper) {
		harperProcess.stop();
	}
	console.log('');
	harperResponse('See you later!');
}

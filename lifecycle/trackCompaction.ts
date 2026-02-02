import { OpenAIResponsesCompactionSession } from '@openai/agents';
import { spinner } from '../utils/shell/spinner';
import { trackedState } from './trackedState';

export function trackCompaction(session: Pick<OpenAIResponsesCompactionSession, 'runCompaction'>) {
	const originalRunCompaction = session.runCompaction.bind(session);
	session.runCompaction = async (args) => {
		const originalMessage = spinner.message;
		spinner.message = 'Compacting conversation history...';
		const wasSpinning = spinner.isSpinning;
		let timeout: NodeJS.Timeout | null = null;
		if (!wasSpinning) {
			if (!trackedState.atStartOfLine) {
				process.stdout.write('\n');
				trackedState.atStartOfLine = true;
			}
			timeout = setTimeout(() => {
				spinner.start();
			}, 50);
		}
		try {
			return await originalRunCompaction(args);
		} finally {
			if (timeout) {
				clearTimeout(timeout);
			}
			if (!wasSpinning) {
				spinner.stop();
			}
			spinner.message = originalMessage;
		}
	};
}

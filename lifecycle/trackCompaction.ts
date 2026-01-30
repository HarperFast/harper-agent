import { OpenAIResponsesCompactionSession } from '@openai/agents';
import { spinner } from '../utils/spinner';
import { trackedState } from './trackedState';

export function trackCompaction(session: OpenAIResponsesCompactionSession) {
	const originalRunCompaction = session.runCompaction.bind(session);
	session.runCompaction = async (args) => {
		const originalMessage = spinner.message;
		spinner.message = 'Compacting conversation history...';
		const wasSpinning = spinner.isSpinning;
		if (!wasSpinning) {
			if (!trackedState.atStartOfLine) {
				process.stdout.write('\n');
				trackedState.atStartOfLine = true;
			}
			await new Promise((resolve) => setTimeout(resolve, 50));
			spinner.start();
		}
		try {
			return await originalRunCompaction(args);
		} finally {
			if (!wasSpinning) {
				spinner.stop();
			}
			spinner.message = originalMessage;
		}
	};
}

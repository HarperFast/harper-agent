import { isHelpRequest, isVersionRequest } from '../utils/cli';
import { handleHelp, handleVersion } from '../utils/cli';
import { trackedState } from './trackedState';

function stripQuotes(str: string): string {
	if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
		return str.slice(1, -1);
	}
	return str;
}

export function parseArgs() {
	const args = process.argv.slice(2);
	if (isHelpRequest(args)) {
		handleHelp();
	}
	if (isVersionRequest(args)) {
		handleVersion();
	}

	for (let i = 0; i < args.length; i++) {
		const arg = args[i]!;

		if (arg === '--model' || arg === '-m' || arg === 'model') {
			if (args[i + 1]) {
				trackedState.model = stripQuotes(args[++i]!);
			}
		} else if (arg.startsWith('--model=')) {
			trackedState.model = stripQuotes(arg.slice('--model='.length));
		} else if (arg.startsWith('model=')) {
			trackedState.model = stripQuotes(arg.slice('model='.length));
		} else if (arg === '--compaction-model' || arg === '-c' || arg === 'compaction-model') {
			if (args[i + 1]) {
				trackedState.compactionModel = stripQuotes(args[++i]!);
			}
		} else if (arg.startsWith('--compaction-model=')) {
			trackedState.compactionModel = stripQuotes(arg.slice('--compaction-model='.length));
		} else if (arg.startsWith('compaction-model=')) {
			trackedState.compactionModel = stripQuotes(arg.slice('compaction-model='.length));
		}
	}

	if (!trackedState.model && process.env.HAIRPER_MODEL) {
		trackedState.model = process.env.HAIRPER_MODEL;
	}

	if (!trackedState.compactionModel && process.env.HAIRPER_COMPACTION_MODEL) {
		trackedState.compactionModel = process.env.HAIRPER_COMPACTION_MODEL;
	}
}

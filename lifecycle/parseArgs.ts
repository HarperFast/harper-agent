import { isHelpRequest, isVersionRequest } from '../utils/shell/cli';
import { handleHelp, handleVersion } from '../utils/shell/cli';
import { isOpenAIModel } from './getModel';
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
		} else if (arg === '--session' || arg === '-s' || arg === 'session') {
			if (args[i + 1]) {
				trackedState.sessionPath = stripQuotes(args[++i]!);
			}
		} else if (arg.startsWith('--session=')) {
			trackedState.sessionPath = stripQuotes(arg.slice('--session='.length));
		} else if (arg.startsWith('session=')) {
			trackedState.sessionPath = stripQuotes(arg.slice('session='.length));
		} else if (arg === '--flex-tier') {
			trackedState.useFlexTier = true;
		} else if (arg === '--no-spinner' || arg === '--disable-spinner') {
			trackedState.disableSpinner = true;
		}
	}

	// Explicit env overrides for direct model configuration
	if (!trackedState.model && process.env.HAIRPER_MODEL) {
		trackedState.model = process.env.HAIRPER_MODEL;
	}

	if (!trackedState.compactionModel && process.env.HAIRPER_COMPACTION_MODEL) {
		trackedState.compactionModel = process.env.HAIRPER_COMPACTION_MODEL;
	}

	if (!trackedState.sessionPath && process.env.HAIRPER_SESSION) {
		trackedState.sessionPath = process.env.HAIRPER_SESSION;
	}

	if (
		!trackedState.useFlexTier && (process.env.HAIRPER_FLEX_TIER === 'true' || process.env.HAIRPER_FLEX_TIER === '1')
	) {
		trackedState.useFlexTier = true;
	}

	// Spinner control via env
	if (
		!trackedState.disableSpinner
		&& (process.env.HAIRPER_NO_SPINNER === 'true' || process.env.HAIRPER_NO_SPINNER === '1'
			|| process.env.HAIRPER_DISABLE_SPINNER === 'true' || process.env.HAIRPER_DISABLE_SPINNER === '1')
	) {
		trackedState.disableSpinner = true;
	}

	// If no model was provided, select a sensible default based on available provider env keys
	if (!trackedState.model) {
		if (process.env.ANTHROPIC_API_KEY) {
			trackedState.model = 'claude-3-7-sonnet-latest';
		} else if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
			trackedState.model = 'gemini-2.0-flash';
		} else if (process.env.OPENAI_API_KEY) {
			trackedState.model = 'gpt-5.2';
		} else if (process.env.OLLAMA_BASE_URL) {
			trackedState.model = 'ollama-qwen3-coder:30b';
		}
		if (!trackedState.model) {
			trackedState.model = 'gpt-5.2';
		}
	}

	// If no compaction model was provided, align it with the chosen provider to avoid extra API key prompts
	if (!trackedState.compactionModel) {
		const m = trackedState.model || '';
		if (m.startsWith('claude-')) {
			trackedState.compactionModel = 'claude-3-5-haiku-latest';
		} else if (m.startsWith('gemini-')) {
			trackedState.compactionModel = 'gemini-1.5-flash';
		} else if (m.startsWith('ollama-')) {
			trackedState.compactionModel = 'ollama-qwen2.5-coder';
		} else {
			trackedState.compactionModel = 'gpt-4o-mini';
		}
	}
	if (isOpenAIModel(trackedState.model) && !trackedState.compactionModel) {
		trackedState.compactionModel = 'gpt-4o-mini';
	}
}

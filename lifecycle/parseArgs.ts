import {
	defaultAnthropicCompactionModel,
	defaultAnthropicModel,
	defaultGoogleCompactionModel,
	defaultGoogleModel,
	defaultModelToken,
	defaultOllamaCompactionModel,
	defaultOllamaModel,
	defaultOpenAICompactionModel,
	defaultOpenAIModel,
} from '../agent/defaults';
import { getDeprecatedReplacement, warnAndPersistRedirect } from '../utils/models/deprecations';
import { handleHelp, handleVersion, isHelpRequest, isVersionRequest } from '../utils/shell/cli';
import { isTrue } from '../utils/strings/isTrue';
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

		const flagPairs = [
			['model', ['--model', '-m', 'model']],
			['compactionModel', ['--compaction-model', '-c', 'compaction-model']],
			['sessionPath', ['--session', '-s', 'session']],
			['maxTurns', ['--max-turns']],
			['maxCost', ['--max-cost']],
			['rateLimitThreshold', ['--rate-limit-threshold']],
			['prompt', ['--prompt', '-p']],
		] as const;

		let handled = false;
		for (const [key, prefixes] of flagPairs) {
			for (const prefix of prefixes) {
				if (arg === prefix) {
					if (args[i + 1]) {
						const val = stripQuotes(args[++i]!);
						if (key === 'maxTurns' || key === 'maxCost' || key === 'rateLimitThreshold') {
							trackedState[key] = parseFloat(val);
						} else {
							trackedState[key] = val;
						}
					}
					handled = true;
					break;
				} else if (arg.startsWith(`${prefix}=`)) {
					const val = stripQuotes(arg.slice(prefix.length + 1));
					if (key === 'maxTurns' || key === 'maxCost' || key === 'rateLimitThreshold') {
						trackedState[key] = parseFloat(val);
					} else {
						trackedState[key] = val;
					}
					handled = true;
					break;
				}
			}
			if (handled) { break; }
		}

		if (handled) { continue; }

		// Handle boolean flags
		if (arg === '--flex-tier') {
			trackedState.useFlexTier = true;
		} else if (arg === '--no-monitor-rate-limits') {
			trackedState.monitorRateLimits = false;
		} else if (arg === '--autonomous' || arg === '-a') {
			trackedState.autonomous = true;
		}
	}

	// Explicit env overrides for direct model configuration
	if (!trackedState.model && process.env.HARPER_AGENT_MODEL) {
		trackedState.model = process.env.HARPER_AGENT_MODEL;
	}
	if (!trackedState.compactionModel && process.env.HARPER_AGENT_COMPACTION_MODEL) {
		trackedState.compactionModel = process.env.HARPER_AGENT_COMPACTION_MODEL;
	}
	if (!trackedState.sessionPath && process.env.HARPER_AGENT_SESSION) {
		trackedState.sessionPath = process.env.HARPER_AGENT_SESSION;
	}

	if (process.env.HARPER_AGENT_MAX_TURNS) {
		trackedState.maxTurns = parseFloat(process.env.HARPER_AGENT_MAX_TURNS);
	}
	if (process.env.HARPER_AGENT_MAX_COST) {
		trackedState.maxCost = parseFloat(process.env.HARPER_AGENT_MAX_COST);
	}
	if (process.env.HARPER_AGENT_RATE_LIMIT_THRESHOLD) {
		trackedState.rateLimitThreshold = parseFloat(process.env.HARPER_AGENT_RATE_LIMIT_THRESHOLD);
	}
	if (process.env.HARPER_AGENT_MONITOR_RATE_LIMITS === 'false') {
		trackedState.monitorRateLimits = false;
	}

	// Do not eagerly resolve sessionPath here. trackedState.sessionPath now
	// dynamically resolves relative to the nearest Harper app (config.yaml)
	// on each access when the provided value is relative. Absolute paths and
	// tilde-prefixed paths are passed through unchanged.

	if (!trackedState.useFlexTier && isTrue(process.env.HARPER_AGENT_FLEX_TIER)) {
		trackedState.useFlexTier = true;
	}

	if (isTrue(process.env.HARPER_AGENT_AUTO_APPROVE_CODE_INTERPRETER)) {
		trackedState.autoApproveCodeInterpreter = true;
	}
	if (isTrue(process.env.HARPER_AGENT_AUTO_APPROVE_PATCHES)) {
		trackedState.autoApprovePatches = true;
	}
	if (isTrue(process.env.HARPER_AGENT_AUTO_APPROVE_SHELL)) {
		trackedState.autoApproveShell = true;
	}
	if (isTrue(process.env.HARPER_AGENT_AUTONOMOUS)) {
		trackedState.autonomous = true;
	}

	// If no model was provided, or it was explicitly set to the sentinel 'default',
	// select a sensible default based on available provider env keys
	if (!trackedState.model || trackedState.model === defaultModelToken) {
		if (process.env.ANTHROPIC_API_KEY) {
			trackedState.model = defaultAnthropicModel;
		} else if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
			trackedState.model = defaultGoogleModel;
		} else if (process.env.OLLAMA_BASE_URL) {
			trackedState.model = defaultOllamaModel;
		} else {
			trackedState.model = defaultOpenAIModel;
		}
	}

	// If no compaction model was provided, or it was 'default', align it with the provider
	// inferred from the resolved primary model to avoid extra API key prompts
	if (!trackedState.compactionModel || trackedState.compactionModel === defaultModelToken) {
		const m = trackedState.model;
		if (m.startsWith('claude-')) {
			trackedState.compactionModel = defaultAnthropicCompactionModel;
		} else if (m.startsWith('gemini-')) {
			trackedState.compactionModel = defaultGoogleCompactionModel;
		} else if (m.startsWith('ollama-')) {
			trackedState.compactionModel = defaultOllamaCompactionModel;
		} else {
			trackedState.compactionModel = defaultOpenAICompactionModel;
		}
	}

	if (!isOpenAIModel(trackedState.model)) {
		process.env.OPENAI_AGENTS_DISABLE_TRACING = process.env.OPENAI_AGENTS_DISABLE_TRACING || '1';
	}

	// Generic deprecation redirection (extensible via utils/models/deprecations.ts)
	const maybeRedirect = (current: string, envKey: 'HARPER_AGENT_MODEL' | 'HARPER_AGENT_COMPACTION_MODEL') => {
		const hit = getDeprecatedReplacement(current);
		if (hit) {
			const { replacement, rule } = hit;
			warnAndPersistRedirect(current, envKey, replacement, rule.reason);
			return replacement;
		}
		return current;
	};

	trackedState.model = maybeRedirect(trackedState.model, 'HARPER_AGENT_MODEL');
	trackedState.compactionModel = maybeRedirect(trackedState.compactionModel, 'HARPER_AGENT_COMPACTION_MODEL');
}

import path from 'node:path';
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
		] as const;

		let handled = false;
		for (const [key, prefixes] of flagPairs) {
			for (const prefix of prefixes) {
				if (arg === prefix) {
					if (args[i + 1]) {
						const val = stripQuotes(args[++i]!);
						if (key === 'maxTurns' || key === 'maxCost' || key === 'rateLimitThreshold') {
							(trackedState as any)[key] = parseFloat(val);
						} else {
							trackedState[key] = val;
						}
					}
					handled = true;
					break;
				} else if (arg.startsWith(`${prefix}=`)) {
					const val = stripQuotes(arg.slice(prefix.length + 1));
					if (key === 'maxTurns' || key === 'maxCost' || key === 'rateLimitThreshold') {
						(trackedState as any)[key] = parseFloat(val);
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

	// Resolve immediately so the path remains stable if CWD changes later
	const sp = trackedState.sessionPath;
	if (sp) {
		trackedState.sessionPath = sp && !sp.startsWith('~') && !path.isAbsolute(sp)
			? path.resolve(process.cwd(), sp)
			: sp;
	}

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
		} else {
			trackedState.model = 'gpt-5.2';
		}
	}

	// If no compaction model was provided, align it with the chosen provider to avoid extra API key prompts
	if (!trackedState.compactionModel) {
		const m = trackedState.model;
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

	if (!isOpenAIModel(trackedState.model)) {
		process.env.OPENAI_AGENTS_DISABLE_TRACING = process.env.OPENAI_AGENTS_DISABLE_TRACING || '1';
	}
}

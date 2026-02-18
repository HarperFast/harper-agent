import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseArgs } from './parseArgs';
import { trackedState } from './trackedState';

const ORIGINAL_ENV = { ...process.env } as Record<string, string | undefined>;
const ORIGINAL_ARGV = [...process.argv];

function resetState() {
	trackedState.atStartOfLine = true;
	trackedState.emptyLines = 0;
	trackedState.approvalState = null;
	trackedState.controller = null;
	trackedState.model = '';
	trackedState.compactionModel = '';
	trackedState.sessionPath = null;
	trackedState.useFlexTier = false;
	trackedState.enableInterruptions = true;
	trackedState.maxTurns = 30;
	trackedState.maxCost = null;
}

function clearAllEnv() {
	clearProviderEnv();
	delete process.env.HARPER_AGENT_DISABLE_INTERRUPTION;
	delete process.env.HARPER_AGENT_DISABLE_INTERRUPTIONS;
	delete process.env.HARPER_AGENT_ENABLE_INTERRUPTION;
	delete process.env.HARPER_AGENT_ENABLE_INTERRUPTIONS;
	delete process.env.HARPER_AGENT_MAX_TURNS;
	delete process.env.HARPER_AGENT_MAX_COST;
}

function clearProviderEnv() {
	delete process.env.HARPER_AGENT_MODEL;
	delete process.env.HARPER_AGENT_COMPACTION_MODEL;
	delete process.env.HARPER_AGENT_SESSION;
	delete process.env.HARPER_AGENT_FLEX_TIER;

	delete process.env.OPENAI_API_KEY;
	delete process.env.ANTHROPIC_API_KEY;
	delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
	delete process.env.OLLAMA_BASE_URL;
}

describe('parseArgs defaults based on ENV provider keys', () => {
	beforeEach(() => {
		process.argv = ['node', 'agent.js'];
		// copy to avoid mutating ORIGINAL_ENV reference
		process.env = { ...ORIGINAL_ENV };
		clearAllEnv();
		resetState();
	});

	afterEach(() => {
		process.env = { ...ORIGINAL_ENV };
		process.argv = [...ORIGINAL_ARGV];
		resetState();
	});

	it('prefers Anthropic when ANTHROPIC_API_KEY is present', () => {
		process.env.ANTHROPIC_API_KEY = 'sk-ant-123';
		parseArgs();
		expect(trackedState.model).toBe('claude-3-7-sonnet-latest');
		expect(trackedState.compactionModel).toBe('claude-3-5-haiku-latest');
	});

	it('uses Google default when GOOGLE_GENERATIVE_AI_API_KEY is present', () => {
		process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'sk-gai-123';
		parseArgs();
		expect(trackedState.model).toBe('gemini-2.0-flash');
		expect(trackedState.compactionModel).toBe('gemini-1.5-flash');
	});

	it('uses OpenAI default when OPENAI_API_KEY is present', () => {
		process.env.OPENAI_API_KEY = 'sk-openai-123';
		parseArgs();
		expect(trackedState.model).toBe('gpt-5.2');
		expect(trackedState.compactionModel).toBe('gpt-4o-mini');
	});

	it('uses Ollama default when OLLAMA_BASE_URL is present', () => {
		process.env.OLLAMA_BASE_URL = 'http://localhost:11434/api';
		parseArgs();
		expect(trackedState.model).toBe('ollama-qwen3-coder:30b');
		expect(trackedState.compactionModel).toBe('ollama-qwen2.5-coder');
	});

	it('HARPER_AGENT_MODEL explicit env should override provider defaults', () => {
		process.env.ANTHROPIC_API_KEY = 'sk-ant-123';
		process.env.HARPER_AGENT_MODEL = 'gpt-4o';
		parseArgs();
		expect(trackedState.model).toBe('gpt-4o');
	});

	it('when multiple provider keys exist, Anthropic takes precedence over OpenAI and Google', () => {
		process.env.OPENAI_API_KEY = 'sk-openai-123';
		process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'sk-gai-123';
		process.env.ANTHROPIC_API_KEY = 'sk-ant-123';
		parseArgs();
		expect(trackedState.model).toBe('claude-3-7-sonnet-latest');
	});
});

describe('parseArgs CLI arguments', () => {
	beforeEach(() => {
		process.argv = ['node', 'agent.js'];
		process.env = { ...ORIGINAL_ENV };
		clearAllEnv();
		resetState();
	});

	it('parses model with --model', () => {
		process.argv.push('--model', 'gpt-4');
		parseArgs();
		expect(trackedState.model).toBe('gpt-4');
	});

	it('parses model with -m', () => {
		process.argv.push('-m', 'gpt-4');
		parseArgs();
		expect(trackedState.model).toBe('gpt-4');
	});

	it('parses model with model prefix', () => {
		process.argv.push('model', 'gpt-4');
		parseArgs();
		expect(trackedState.model).toBe('gpt-4');
	});

	it('parses model with --model=', () => {
		process.argv.push('--model=gpt-4');
		parseArgs();
		expect(trackedState.model).toBe('gpt-4');
	});

	it('parses model with -m=', () => {
		process.argv.push('-m=gpt-4');
		parseArgs();
		expect(trackedState.model).toBe('gpt-4');
	});

	it('parses model with model=', () => {
		process.argv.push('model=gpt-4');
		parseArgs();
		expect(trackedState.model).toBe('gpt-4');
	});

	it('strips quotes from model argument', () => {
		process.argv.push('--model', '"gpt-4"');
		parseArgs();
		expect(trackedState.model).toBe('gpt-4');
	});

	it('parses compaction model with --compaction-model', () => {
		process.argv.push('--compaction-model', 'claude-3-haiku');
		parseArgs();
		expect(trackedState.compactionModel).toBe('claude-3-haiku');
	});

	it('parses compaction model with -c=', () => {
		process.argv.push('-c=claude-3-haiku');
		parseArgs();
		expect(trackedState.compactionModel).toBe('claude-3-haiku');
	});

	it('parses session path with --session', () => {
		process.argv.push('--session', './my-session.json');
		parseArgs();
		expect(trackedState.sessionPath).toEqual(expect.stringMatching(/my-session\.json$/));
	});

	it('parses session path with -s=', () => {
		process.argv.push('-s=./my-session.json');
		parseArgs();
		expect(trackedState.sessionPath).toEqual(expect.stringMatching(/my-session\.json$/));
	});

	it('parses boolean flag --flex-tier', () => {
		process.argv.push('--flex-tier');
		parseArgs();
		expect(trackedState.useFlexTier).toBe(true);
	});

	it('parses boolean flag --no-interrupt', () => {
		process.argv.push('--no-interrupt');
		parseArgs();
		expect(trackedState.enableInterruptions).toBe(false);
	});

	it('parses boolean flag --disable-interruptions', () => {
		process.argv.push('--disable-interruptions');
		parseArgs();
		expect(trackedState.enableInterruptions).toBe(false);
	});
});

describe('parseArgs Environment Variables', () => {
	beforeEach(() => {
		process.argv = ['node', 'agent.js'];
		process.env = { ...ORIGINAL_ENV };
		clearAllEnv();
		resetState();
	});

	it('uses HARPER_AGENT_SESSION', () => {
		process.env.HARPER_AGENT_SESSION = './env-session.json';
		parseArgs();
		const expected = path.resolve(process.cwd(), './env-session.json');
		expect(trackedState.sessionPath).toBe(expected);
	});

	it('uses HARPER_AGENT_FLEX_TIER=true', () => {
		process.env.HARPER_AGENT_FLEX_TIER = 'true';
		parseArgs();
		expect(trackedState.useFlexTier).toBe(true);
	});

	it('uses HARPER_AGENT_FLEX_TIER=1', () => {
		process.env.HARPER_AGENT_FLEX_TIER = '1';
		parseArgs();
		expect(trackedState.useFlexTier).toBe(true);
	});

	it('uses HARPER_AGENT_DISABLE_INTERRUPTION=true', () => {
		process.env.HARPER_AGENT_DISABLE_INTERRUPTION = 'true';
		parseArgs();
		expect(trackedState.enableInterruptions).toBe(false);
	});

	it('uses HARPER_AGENT_ENABLE_INTERRUPTIONS=false', () => {
		process.env.HARPER_AGENT_ENABLE_INTERRUPTIONS = 'false';
		parseArgs();
		expect(trackedState.enableInterruptions).toBe(false);
	});

	it('uses HARPER_AGENT_ENABLE_INTERRUPTIONS=0', () => {
		process.env.HARPER_AGENT_ENABLE_INTERRUPTIONS = '0';
		parseArgs();
		expect(trackedState.enableInterruptions).toBe(false);
	});

	it('uses HARPER_AGENT_DISABLE_INTERRUPTIONS=1', () => {
		process.env.HARPER_AGENT_DISABLE_INTERRUPTIONS = '1';
		parseArgs();
		expect(trackedState.enableInterruptions).toBe(false);
	});

	it('CLI arg takes precedence over Env var', () => {
		process.env.HARPER_AGENT_MODEL = 'gpt-env';
		process.argv.push('--model', 'gpt-cli');
		parseArgs();
		expect(trackedState.model).toBe('gpt-cli');
	});

	it('resolves relative HARPER_AGENT_SESSION without ./ to absolute path', () => {
		process.env.HARPER_AGENT_SESSION = 'env-session.json';
		parseArgs();
		const expected = path.resolve(process.cwd(), 'env-session.json');
		expect(trackedState.sessionPath).toBe(expected);
	});

	it('does not resolve absolute HARPER_AGENT_SESSION path', () => {
		const abs = path.resolve(process.cwd(), 'abs-session.json');
		process.env.HARPER_AGENT_SESSION = abs;
		parseArgs();
		expect(trackedState.sessionPath).toBe(abs);
	});

	it('does not resolve tilde-prefixed HARPER_AGENT_SESSION path', () => {
		process.env.HARPER_AGENT_SESSION = '~/env-session.json';
		parseArgs();
		expect(trackedState.sessionPath).toBe('~/env-session.json');
	});

	it('keeps env-driven sessionPath stable across cwd changes', () => {
		const original = process.cwd();
		try {
			process.env.HARPER_AGENT_SESSION = './env-session.json';
			parseArgs();
			const first = trackedState.sessionPath;
			process.chdir(path.dirname(original));
			process.chdir(original);
			expect(trackedState.sessionPath).toBe(first);
		} finally {
			process.chdir(original);
		}
	});

	it('CLI --session takes precedence over HARPER_AGENT_SESSION', () => {
		process.env.HARPER_AGENT_SESSION = './env-session.json';
		process.argv.push('--session', 'cli-session.json');
		parseArgs();
		expect(trackedState.sessionPath).toEqual(expect.stringMatching(/cli-session\.json$/));
	});
});

describe('parseArgs edge cases and mixed scenarios', () => {
	beforeEach(() => {
		process.argv = ['node', 'agent.js'];
		process.env = { ...ORIGINAL_ENV };
		clearAllEnv();
		resetState();
	});

	it('handles multiple key-value pairs', () => {
		process.argv.push('--model', 'gpt-4', '--session', 'sess.json', '-c=claude-3');
		parseArgs();
		expect(trackedState.model).toBe('gpt-4');
		expect(trackedState.sessionPath).toEqual(expect.stringMatching(/sess\.json$/));
		expect(trackedState.compactionModel).toBe('claude-3');
	});

	it('ignores missing value for prefix', () => {
		process.argv.push('--model');
		parseArgs();
		// Should still be empty or default
		expect(trackedState.model).not.toBe('--model');
	});

	it('handles empty value in prefix= by falling back to default', () => {
		process.argv.push('--model=');
		parseArgs();
		expect(trackedState.model).toBe('gpt-5.2');
	});

	it('handles single quotes in arguments', () => {
		process.argv.push('--model', "'gpt-4'");
		parseArgs();
		expect(trackedState.model).toBe('gpt-4');
	});

	it('disables OpenAI tracing for non-OpenAI models', () => {
		process.env.ANTHROPIC_API_KEY = 'sk-ant-123';
		delete process.env.OPENAI_AGENTS_DISABLE_TRACING;
		parseArgs();
		expect(trackedState.model).toBe('claude-3-7-sonnet-latest');
		expect(process.env.OPENAI_AGENTS_DISABLE_TRACING).toBe('1');
	});

	it('does not disable OpenAI tracing for OpenAI models', () => {
		process.env.OPENAI_API_KEY = 'sk-openai-123';
		delete process.env.OPENAI_AGENTS_DISABLE_TRACING;
		parseArgs();
		expect(trackedState.model).toBe('gpt-5.2');
		expect(process.env.OPENAI_AGENTS_DISABLE_TRACING).toBeUndefined();
	});

	it('respects existing OPENAI_AGENTS_DISABLE_TRACING', () => {
		process.env.ANTHROPIC_API_KEY = 'sk-ant-123';
		process.env.OPENAI_AGENTS_DISABLE_TRACING = '0';
		parseArgs();
		expect(process.env.OPENAI_AGENTS_DISABLE_TRACING).toBe('0');
	});

	it('parses --max-turns', () => {
		process.argv.push('--max-turns', '50');
		parseArgs();
		expect(trackedState.maxTurns).toBe(50);
	});

	it('parses --max-turns with =', () => {
		process.argv.push('--max-turns=100');
		parseArgs();
		expect(trackedState.maxTurns).toBe(100);
	});

	it('parses --max-cost', () => {
		process.argv.push('--max-cost', '1.5');
		parseArgs();
		expect(trackedState.maxCost).toBe(1.5);
	});

	it('parses --max-cost from env', () => {
		process.env.HARPER_AGENT_MAX_COST = '2.5';
		parseArgs();
		expect(trackedState.maxCost).toBe(2.5);
	});

	it('parses --max-turns from env', () => {
		process.env.HARPER_AGENT_MAX_TURNS = '75';
		parseArgs();
		expect(trackedState.maxTurns).toBe(75);
	});
});

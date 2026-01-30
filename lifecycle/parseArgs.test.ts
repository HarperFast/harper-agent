import { afterEach, describe, expect, it } from 'vitest';
import { parseArgs } from './parseArgs';
import { trackedState } from './trackedState';

describe('parseArgs', () => {
	const originalArgv = process.argv;
	const originalEnv = process.env;

	afterEach(() => {
		process.argv = originalArgv;
		process.env = { ...originalEnv };
		trackedState.model = null;
		trackedState.compactionModel = null;
	});

	it('should set model from --model flag', () => {
		process.argv = ['node', 'agent.js', '--model', 'claude-3-sonnet'];
		parseArgs();
		expect(trackedState.model).toBe('claude-3-sonnet');
	});

	it('should set model from -m flag', () => {
		process.argv = ['node', 'agent.js', '-m', 'gpt-4o'];
		parseArgs();
		expect(trackedState.model).toBe('gpt-4o');
	});

	it('should set model from HAIRPER_MODEL env var', () => {
		process.argv = ['node', 'agent.js'];
		process.env.HAIRPER_MODEL = 'gemini-pro';
		parseArgs();
		expect(trackedState.model).toBe('gemini-pro');
	});

	it('should prefer command line flag over env var', () => {
		process.argv = ['node', 'agent.js', '--model', 'claude-3-sonnet'];
		process.env.HAIRPER_MODEL = 'gemini-pro';
		parseArgs();
		expect(trackedState.model).toBe('claude-3-sonnet');
	});

	it('should handle --model=gpt-4o', () => {
		process.argv = ['node', 'agent.js', '--model=gpt-4o'];
		parseArgs();
		expect(trackedState.model).toBe('gpt-4o');
	});

	it('should handle --model="gpt-4o"', () => {
		process.argv = ['node', 'agent.js', '--model="gpt-4o"'];
		parseArgs();
		expect(trackedState.model).toBe('gpt-4o');
	});

	it('should handle model=gpt-4o', () => {
		process.argv = ['node', 'agent.js', 'model=gpt-4o'];
		parseArgs();
		expect(trackedState.model).toBe('gpt-4o');
	});

	it('should handle model="gpt-4o"', () => {
		process.argv = ['node', 'agent.js', 'model="gpt-4o"'];
		parseArgs();
		expect(trackedState.model).toBe('gpt-4o');
	});

	it("should handle model='gpt-4o'", () => {
		process.argv = ['node', 'agent.js', "model='gpt-4o'"];
		parseArgs();
		expect(trackedState.model).toBe('gpt-4o');
	});

	it('should handle model gpt-4o', () => {
		process.argv = ['node', 'agent.js', 'model', 'gpt-4o'];
		parseArgs();
		expect(trackedState.model).toBe('gpt-4o');
	});

	it('should set compaction model from --compaction-model flag', () => {
		process.argv = ['node', 'agent.js', '--compaction-model', 'gpt-4o'];
		parseArgs();
		expect(trackedState.compactionModel).toBe('gpt-4o');
	});

	it('should set compaction model from -c flag', () => {
		process.argv = ['node', 'agent.js', '-c', 'claude-3-haiku'];
		parseArgs();
		expect(trackedState.compactionModel).toBe('claude-3-haiku');
	});

	it('should handle --compaction-model=gpt-4o', () => {
		process.argv = ['node', 'agent.js', '--compaction-model=gpt-4o'];
		parseArgs();
		expect(trackedState.compactionModel).toBe('gpt-4o');
	});

	it('should handle compaction-model=gpt-4o', () => {
		process.argv = ['node', 'agent.js', 'compaction-model=gpt-4o'];
		parseArgs();
		expect(trackedState.compactionModel).toBe('gpt-4o');
	});

	it('should handle compaction-model gpt-4o', () => {
		process.argv = ['node', 'agent.js', 'compaction-model', 'gpt-4o'];
		parseArgs();
		expect(trackedState.compactionModel).toBe('gpt-4o');
	});

	it('should set compaction model from HAIRPER_COMPACTION_MODEL env var', () => {
		process.argv = ['node', 'agent.js'];
		process.env.HAIRPER_COMPACTION_MODEL = 'gemini-flash';
		parseArgs();
		expect(trackedState.compactionModel).toBe('gemini-flash');
	});

	it('should prefer compaction command line flag over env var', () => {
		process.argv = ['node', 'agent.js', '-c', 'gpt-4o'];
		process.env.HAIRPER_COMPACTION_MODEL = 'gemini-flash';
		parseArgs();
		expect(trackedState.compactionModel).toBe('gpt-4o');
	});
});

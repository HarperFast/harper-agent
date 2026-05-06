import { useApp } from 'ink';
import { render } from 'ink-testing-library';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MainConfig } from '../ink/main';

vi.mock('node:fs');

vi.mock('ink', async () => {
	const actual = await vi.importActual('ink');
	return {
		...actual,
		useApp: vi.fn(),
	};
});

vi.mock('../lifecycle/trackedState', () => ({
	trackedState: {
		cwd: '/test/cwd',
	},
}));

const down = '\u001B[B';
const enter = '\r';

describe('Settings — Ollama Provider', () => {
	// Falls back to the host used during development if not set in env
	const OLLAMA_TEST_HOST = process.env.OLLAMA_TEST_HOST ?? '172.16.1.41';
	const ollamaBaseUrl = `http://${OLLAMA_TEST_HOST}:11434/api`;
	const mockExit = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		(useApp as any).mockReturnValue({ exit: mockExit });

		vi.mocked(existsSync).mockReturnValue(false);
		vi.mocked(writeFileSync).mockImplementation(() => {});
		vi.mocked(readFileSync).mockReturnValue('');
		vi.mocked(mkdirSync).mockImplementation(() => undefined as any);

		delete process.env.OLLAMA_BASE_URL;
		delete process.env.HARPER_AGENT_MODEL;
		delete process.env.HARPER_AGENT_COMPACTION_MODEL;

		// Set before rendering so fetchOllamaModels uses the right host when the
		// Ollama provider is selected — the fetch fires before ApiUrlStep is submitted.
		process.env.OLLAMA_BASE_URL = ollamaBaseUrl;
	});

	it(
		'navigates the settings wizard with Ollama, picks the first available model, and reaches the chat interface',
		async () => {
			const onComplete = vi.fn();
			const { lastFrame, stdin } = render(
				React.createElement(MainConfig, { onComplete }),
			);

			const simulateKey = async (input: string) => {
				stdin.write(input);
				await new Promise(resolve => setTimeout(resolve, 100));
			};

			const waitForContent = async (expected: string, timeoutMs = 15_000) => {
				const start = Date.now();
				while (!lastFrame()?.includes(expected)) {
					if (Date.now() - start > timeoutMs) {
						throw new Error(
							`Timed out after ${timeoutMs}ms waiting for: "${expected}"\nCurrent frame:\n${lastFrame()}`,
						);
					}
					await new Promise(resolve => setTimeout(resolve, 100));
				}
			};

			// Step 1: ProviderStep — navigate to Ollama (3 steps down from OpenAI)
			await waitForContent('What model provider would you like to use today?');
			await simulateKey(down); // Anthropic → Google
			await simulateKey(down); // Google → Ollama
			await simulateKey(enter);

			// Step 2: ApiUrlStep — confirm the Ollama host URL
			await waitForContent('Where are you hosting Ollama?');
			// Accept the default (from the environment)
			await simulateKey(enter);

			// Step 3: ModelSelectionStep — wait for Ollama models to load, pick the first
			await waitForContent('What model would you like to use?', 15_000);
			await simulateKey(enter);

			// Step 4: ModelSelectionStep (compactor) — pick the first model
			await waitForContent('What model should we use for memory compaction?');
			await simulateKey(enter);

			// Step 5: EnvironmentSettingsStep — accept all defaults
			await waitForContent('Additional Settings');
			await simulateKey(enter);

			// Wizard complete — onComplete is the gateway to the chat interface
			expect(onComplete).toHaveBeenCalled();
			expect(writeFileSync).toHaveBeenCalled();
			expect(process.env.OLLAMA_BASE_URL).toBe(ollamaBaseUrl);
		},
		60_000,
	);
});

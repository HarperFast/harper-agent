import spawn from 'cross-spawn';
import { type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach } from 'vitest';
import { trackedState } from '../../lifecycle/trackedState';

export class Chat {
	private originalCwd = trackedState.cwd;
	private tempDir: string | undefined;
	private child: ChildProcessWithoutNullStreams | null = null;
	public stdoutBuf: string = '';
	private readonly PROMPT_RE = /\n>\s*$/; // matches a CLI prompt at the end of the current buffer
	// Small delay to ensure no additional output arrives immediately after the prompt
	private readonly PROMPT_DELAY_MS = 75;

	constructor() {
		beforeEach(async () => {
			// Create a fresh temporary working directory and switch into it
			this.tempDir = mkdtempSync(join(os.tmpdir(), 'harper-agent-e2e-'));
			process.chdir(this.tempDir);
		}, 60_000);

		afterEach(() => {
			// Attempt to stop the CLI if still running
			try {
				this.child?.kill('SIGINT');
			} catch {}

			// Restore cwd then cleanup temp directory
			try {
				process.chdir(this.originalCwd);
			} catch {}
			try {
				if (this.tempDir) {
					rmSync(this.tempDir, { recursive: true, force: true });
				}
			} catch {}
		});
	}

	/**
	 * Spawn the CLI process in a fresh temp directory. Returns an async generator
	 * that yields all stdout accumulated up to (but not including) each prompt occurrence.
	 *
	 * Usage in tests:
	 *   const out = chat.bootstrap();
	 *   await out.next(); // Wait for initial prompt
	 *   chat.sendLine('your instruction');
	 *   // ... optionally, await next(out.next()) to sync on subsequent prompts
	 */
	bootstrap(): AsyncGenerator<string, void, void> {
		const cliPath = join(this.originalCwd, 'dist', 'agent.js');

		this.stdoutBuf = '';

		this.child = spawn(process.execPath, [
			cliPath,
			'--model',
			process.env.HARPER_AGENT_MODEL || 'gpt-4o-mini',
		], {
			cwd: this.tempDir,
			env: {
				...process.env,
				HARPER_AGENT_SKIP_UPDATE: 'true',
				// _HARPER_TEST_CLI: 'true',
				HARPER_AGENT_AUTO_APPROVE_PATCHES: '1',
				HARPER_AGENT_AUTO_APPROVE_CODE_INTERPRETER: '1',
				HARPER_AGENT_AUTO_APPROVE_SHELL: '1',
				OPENAI_AGENTS_DISABLE_TRACING: process.env.OPENAI_AGENTS_DISABLE_TRACING || '1',
				OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
			},
			stdio: ['pipe', 'pipe', 'pipe'],
		}) as ChildProcessWithoutNullStreams;

		return this.#createPromptStream();
	}

	/**
	 * Async generator that yields stdout chunks ending when a prompt appears.
	 * Each yield returns text up to (but not including) the prompt. Continues
	 * until the process exits. Cleans up listeners when closed.
	 */
	async *#createPromptStream(): AsyncGenerator<string, void, void> {
		if (!this.child) { return; }

		let localBuffer = '';
		const queue: string[] = [];
		let resolveNext: ((value: string) => void) | null = null;
		let done = false;

		const offer = (value: string) => {
			if (resolveNext) {
				const r = resolveNext;
				resolveNext = null;
				r(value);
			} else {
				queue.push(value);
			}
		};

		let promptTimer: NodeJS.Timeout | null = null;

		const onStdout = (chunk: Buffer) => {
			const text = chunk.toString();
			this.stdoutBuf += text;
			// process.stdout.write(text);
			localBuffer += text;

			// If we previously detected a prompt, reset the timer as new output arrived
			if (promptTimer) {
				clearTimeout(promptTimer);
				promptTimer = null;
			}

			// If the buffer currently ends with a prompt, wait a short grace period to
			// ensure no more text comes in before emitting up to the prompt.
			if (this.PROMPT_RE.test(localBuffer)) {
				promptTimer = setTimeout(() => {
					// Double-check that we still end with a prompt before emitting
					if (this.PROMPT_RE.test(localBuffer)) {
						const matchIndex = localBuffer.search(this.PROMPT_RE);
						const emit = localBuffer.slice(0, matchIndex);
						// Reset buffer after prompt. Anything beyond the prompt stays for next round
						localBuffer = '';
						offer(emit);
					}
					promptTimer = null;
				}, this.PROMPT_DELAY_MS);
			}
		};

		const onStderr = (chunk: Buffer) => {
			// Capture stderr into the overall buffer for debugging, but do not treat as prompt
			this.stdoutBuf += chunk.toString();
		};

		const onClose = () => {
			done = true;
			// flush remaining buffer if any
			if (localBuffer) {
				offer(localBuffer);
				localBuffer = '';
			}
			if (promptTimer) {
				clearTimeout(promptTimer);
				promptTimer = null;
			}
		};

		this.child.stdout.on('data', onStdout);
		this.child.stderr.on('data', onStderr);
		this.child.on('close', onClose);

		try {
			while (!done) {
				const nextChunk = queue.length
					? queue.shift()!
					: await new Promise<string>(res => {
						resolveNext = res;
					});
				console.log(`Harper: ${nextChunk}`);
				yield nextChunk;
			}
		} finally {
			// Cleanup listeners when consumer stops iterating
			this.child?.stdout.off('data', onStdout);
			this.child?.stderr.off('data', onStderr);
			this.child?.off('close', onClose);
		}
	}

	sendLine(line: string) {
		this.child!.stdin.write(line + '\n');
		process.stdout.write(line + '\n');
	}

	async waitForFiles(timeoutMs: number, filesFound: (files: string[]) => boolean) {
		const start = Date.now();
		while (Date.now() - start < timeoutMs) {
			const readDir = readdirSync(this.tempDir!, { recursive: true }).filter(a => typeof a === 'string');
			if (filesFound(readDir)) {
				return true;
			}
			await new Promise((r) => setTimeout(r, 1000));
		}
		return false;
	}

	stop() {
		// Stop the CLI (gracefully)
		try {
			this.child!.kill('SIGINT');
		} catch {}
	}
}

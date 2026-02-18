import type { Shell, ShellAction, ShellOutputResult, ShellResult } from '@openai/agents';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { commandId } from '../../ink/contexts/ShellContext';
import { emitToListeners } from '../../ink/emitters/listener';
import { trackedState } from '../../lifecycle/trackedState';
import { getEnv } from '../getEnv';

const execAsync = promisify(exec);

export class LocalShell implements Shell {
	private readonly defaultTimeoutMs: number;

	constructor(options?: { defaultTimeoutMs?: number }) {
		const envValRaw = getEnv('HARPER_AGENT_SHELL_TIMEOUT_MS', 'SHELL_DEFAULT_TIMEOUT_MS');
		const envVal = envValRaw !== undefined ? Number(envValRaw) : undefined;
		this.defaultTimeoutMs = options?.defaultTimeoutMs ?? (
			envVal !== undefined && !Number.isNaN(envVal) ? envVal : 20_000
		);
	}

	async run(action: ShellAction): Promise<ShellResult> {
		const output: ShellResult['output'] = [];

		for (const command of action.commands) {
			let stdout = '';
			let stderr = '';
			let exitCode: number = 0;
			let outcome: ShellOutputResult['outcome'] = {
				type: 'exit',
				exitCode: 0,
			};

			const parts = command.split(' ');
			const firstPart = parts[0]!;
			const laterParts = parts.slice(1).join(' ') || '';

			let myCommandId = commandId;
			emitToListeners('AddShellCommand', {
				command: firstPart,
				args: laterParts,
				running: true,
			});

			try {
				const { stdout: localStdout, stderr: localStderr } = await execAsync(
					command,
					{
						cwd: trackedState.cwd,
						// Prefer per-call timeout, else default
						timeout: action.timeoutMs ?? this.defaultTimeoutMs,
						maxBuffer: action.maxOutputLength,
					},
				);
				stdout = localStdout;
				stderr = localStderr;
			} catch (error: any) {
				exitCode = typeof error?.code === 'number' ? error.code : null;
				stdout = error?.stdout ?? '';
				stderr = error?.stderr ?? '';
				outcome = error?.killed || error?.signal === 'SIGTERM'
					? { type: 'timeout' }
					: { type: 'exit', exitCode };
			}

			emitToListeners('UpdateShellCommand', {
				id: myCommandId,
				running: false,
				exitCode,
			});

			output.push({
				command,
				stdout,
				stderr,
				outcome,
			});
			if (outcome.type === 'timeout') {
				break;
			}
		}

		return {
			output,
			providerData: {
				working_directory: trackedState.cwd,
			},
		};
	}
}

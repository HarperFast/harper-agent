import type { Shell, ShellAction, ShellOutputResult, ShellResult } from '@openai/agents';
import { exec } from 'node:child_process';
import process from 'node:process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export class LocalShell implements Shell {
	private readonly cwd: string = process.cwd();

	async run(action: ShellAction): Promise<ShellResult> {
		const output: ShellResult['output'] = [];

		for (const command of action.commands) {
			let stdout = '';
			let stderr = '';
			let exitCode: number | null = 0;
			let outcome: ShellOutputResult['outcome'] = {
				type: 'exit',
				exitCode: 0,
			};
			try {
				const { stdout: localStdout, stderr: localStderr } = await execAsync(
					command,
					{
						cwd: this.cwd,
						timeout: action.timeoutMs,
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
				working_directory: this.cwd,
			},
		};
	}
}

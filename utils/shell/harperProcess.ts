import { ChildProcess, execSync, spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';

class HarperProcess {
	private childProcess: ChildProcess | null = null;
	private externalPid: number | null = null;
	private logTailProcess: ChildProcess | null = null;
	private logs: string[] = [];
	public httpPort: number = 9926;

	get running(): boolean {
		if (this.childProcess !== null) {
			return true;
		}

		this.updateExternalStatus();
		return this.externalPid !== null;
	}

	get startedByHairper(): boolean {
		return this.childProcess !== null;
	}

	private updateExternalStatus(): void {
		try {
			const status = execSync('harper status', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
			if (status.includes('status: running')) {
				const pidMatch = status.match(/pid: (\d+)/);
				if (pidMatch?.[1]) {
					this.externalPid = parseInt(pidMatch[1], 10);
					if (!this.logTailProcess) {
						this.startTailingLogs();
					}
					return;
				}
			}
		} catch {
			// Ignore errors
		}

		this.externalPid = null;
		this.stopTailingLogs();
	}

	private startTailingLogs(): void {
		const logPath = join(homedir(), 'hdb', 'log', 'hdb.log');
		this.logTailProcess = spawn('tail', ['-f', logPath], {
			stdio: ['ignore', 'pipe', 'pipe'],
		});

		this.logTailProcess.stdout?.on('data', (data) => {
			const string = data.toString();
			this.updatePortFromLogs(string);
			this.logs.push(string);
		});

		this.logTailProcess.stderr?.on('data', (data) => {
			this.logs.push(data.toString());
		});

		this.logTailProcess.on('exit', () => {
			this.logTailProcess = null;
		});
	}

	private stopTailingLogs(): void {
		if (this.logTailProcess) {
			this.logTailProcess.kill();
			this.logTailProcess = null;
		}
	}

	private updatePortFromLogs(string: string): void {
		if (string.includes('REST:') && string.includes('HTTP:')) {
			this.httpPort = parseInt(string.split('HTTP:').pop()!.split(',')[0]!, 10);
		}
	}

	public start(directoryName: string): void {
		if (this.running) {
			throw new Error('Harper process is already running.');
		}

		this.logs = [];
		this.childProcess = spawn('harperdb', ['dev', '.'], {
			cwd: directoryName,
			stdio: ['ignore', 'pipe', 'pipe'],
		});

		this.childProcess.stdout?.on('data', (data) => {
			const string = data.toString();
			this.updatePortFromLogs(string);
			this.logs.push(string);
		});

		this.childProcess.stderr?.on('data', (data) => {
			this.logs.push(data.toString());
		});

		this.childProcess.on('exit', () => {
			this.childProcess = null;
		});
	}

	public stop(): void {
		if (this.childProcess) {
			this.childProcess.kill();
			this.childProcess = null;
		}

		if (this.externalPid) {
			try {
				process.kill(this.externalPid);
			} catch {
				// Ignore if already dead
			}
			this.externalPid = null;
		}

		this.stopTailingLogs();
	}

	public getAndClearLogs(): string {
		const logs = this.logs;
		this.logs = [];
		return logs.join('');
	}
}

export const harperProcess = new HarperProcess();

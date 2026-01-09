import {ChildProcess, spawn} from 'node:child_process';

class HarperProcess {
	private childProcess: ChildProcess|null = null;
	private logs: string[] = [];

	get running(): boolean {
		return this.childProcess !== null;
	}

	public start(directoryName: string): void {
		if (this.childProcess) {
			throw new Error('Harper process is already running.');
		}

		this.logs = [];
		this.childProcess = spawn('harperdb', ['dev', '.'], {
			cwd: directoryName,
			stdio: ['ignore', 'pipe', 'pipe'],
			shell: true,
		});

		this.childProcess.stdout?.on('data', (data) => {
			this.logs.push(data.toString());
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
	}

	public getAndClearLogs(): string {
		const logs = this.logs;
		this.logs = [];
		return logs.join('');
	}
}

export const harperProcess = new HarperProcess();

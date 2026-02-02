import process from 'node:process';
import { trackedState } from '../../lifecycle/trackedState';
import { harperResponse } from './harperResponse';

class Spinner {
	private interval: NodeJS.Timeout | null = null;
	private chars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
	private i = 0;
	public message: string;
	public status = '';
	private onData: ((data: Buffer) => void) | null = null;

	constructor(message: string = 'Thinking...') {
		this.message = message;
	}

	public get isSpinning() {
		return this.interval !== null;
	}

	start() {
		if (this.interval) {
			return;
		}

		this.onData = (data: Buffer) => {
			const str = data.toString();
			if (str.includes('\n') || str.includes('\r')) {
				this.interrupt();
			}
		};

		process.stdin.on('data', this.onData);
		if (process.stdin.isTTY) {
			process.stdin.resume();
		}

		this.i = 0;
		process.stdout.write(`${this.chars[this.i]} ${this.message}${this.status ? ' ' + this.status : ''}\x1b[K`);
		this.interval = setInterval(() => {
			this.i = (this.i + 1) % this.chars.length;
			process.stdout.write(`\r${this.chars[this.i]} ${this.message}${this.status ? ' ' + this.status : ''}\x1b[K`);
		}, 80);
	}

	interrupt() {
		if (trackedState.controller) {
			this.stop();
			trackedState.controller.abort();
			harperResponse('<thought interrupted>');
			trackedState.atStartOfLine = true;
		}
	}

	stop() {
		if (!this.interval) { return; }
		clearInterval(this.interval);

		if (this.onData) {
			process.stdin.removeListener('data', this.onData);
			this.onData = null;
		}

		this.interval = null;
		this.status = '';
		process.stdout.write('\r\x1b[K');
	}
}

export const spinner = new Spinner();

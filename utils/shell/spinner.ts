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
		const disabled = trackedState.disableSpinner
			|| process.env.HAIRPER_NO_SPINNER === 'true'
			|| process.env.HAIRPER_NO_SPINNER === '1'
			|| process.env.HAIRPER_DISABLE_SPINNER === 'true'
			|| process.env.HAIRPER_DISABLE_SPINNER === '1';
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

		if (disabled) {
			// Do not render spinner, but keep onData listener active for interrupt support
			this.interval = null;
			console.log('Thinking...');
			return;
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
		// Always detach input listener if attached
		if (this.onData) {
			process.stdin.removeListener('data', this.onData);
			this.onData = null;
		}

		if (this.interval) {
			clearInterval(this.interval);
			this.interval = null;
			this.status = '';
			process.stdout.write('\r\x1b[K');
		} else {
			// When disabled (no interval), still reset status without writing spinner clearing sequences
			this.status = '';
		}
	}
}

export const spinner = new Spinner();

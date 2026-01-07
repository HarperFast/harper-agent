import process from 'node:process';

class Spinner {
	private interval: NodeJS.Timeout | null = null;
	private chars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
	private i = 0;
	private readonly message: string;

	constructor(message: string = 'Thinking...') {
		this.message = message;
	}

	start() {
		if (this.interval) return;
		this.i = 0;
		process.stdout.write(`${this.chars[this.i]} ${this.message}`);
		this.interval = setInterval(() => {
			this.i = (this.i + 1) % this.chars.length;
			process.stdout.write(`\r${this.chars[this.i]} ${this.message}`);
		}, 80);
	}

	stop() {
		if (!this.interval) return;
		clearInterval(this.interval);
		this.interval = null;
		process.stdout.write('\r\x1b[K');
	}
}

export const spinner = new Spinner();

import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

const ERROR_LOG_PATH = join(homedir(), '.harper', 'harper-agent-errors');

export function logError(error: unknown) {
	const message = error instanceof Error ? error.stack || error.message : String(error);
	const timestamp = new Date().toISOString();
	const logEntry = `[${timestamp}] ${message}\n\n`;

	try {
		const dir = dirname(ERROR_LOG_PATH);
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}
		appendFileSync(ERROR_LOG_PATH, logEntry, 'utf8');
	} catch (err) {
		// Fallback to console if logging fails
		console.error('Failed to write to error log:', err);
		console.error('Original error:', error);
	}
}

export function setupGlobalErrorHandlers() {
	process.on('uncaughtException', (error) => {
		logError(error);
		console.error('Uncaught Exception:', error);
		process.exit(1);
	});

	process.on('unhandledRejection', (reason) => {
		logError(reason);
		console.error('Unhandled Rejection:', reason);
	});
}

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { trackedState } from '../../lifecycle/trackedState';

/**
 * Updates an environment variable in both the current process and the .env file.
 * Prefers the home directory harper-specific config if it exists.
 * If the top-level config doesn't exist, it creates it.
 * @param key The environment variable key.
 * @param value The environment variable value.
 * @returns A promise that resolves to true if successful, or throws an error.
 */
export function updateEnv(key: string, value: string) {
	process.env[key] = value;
	const topLevelEnvPath = join(homedir(), '.harper', 'harper-agent-env');
	const localEnvPath = join(trackedState.cwd, '.env');

	// If top-level doesn't exist, we create the directory and use top-level path
	// unless a local .env already exists.
	const envPath = existsSync(topLevelEnvPath) || !existsSync(localEnvPath) ? topLevelEnvPath : localEnvPath;

	const dir = dirname(envPath);
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}

	let envContent = '';
	if (existsSync(envPath)) {
		envContent = readFileSync(envPath, 'utf8');
	}

	const regex = new RegExp(`^${key}=.*`, 'm');
	if (regex.test(envContent)) {
		envContent = envContent.replace(regex, `${key}=${value}`);
	} else {
		if (envContent && !envContent.endsWith('\n')) {
			envContent += '\n';
		}
		envContent += `${key}=${value}\n`;
	}

	writeFileSync(envPath, envContent);
}

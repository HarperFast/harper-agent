import { existsSync } from 'node:fs';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { trackedState } from '../../lifecycle/trackedState';

/**
 * Updates an environment variable in both the current process and the .env file.
 * @param key The environment variable key.
 * @param value The environment variable value.
 * @returns A promise that resolves to true if successful, or throws an error.
 */
export function updateEnv(key: string, value: string) {
	process.env[key] = value;
	const envPath = join(trackedState.cwd, '.env');

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

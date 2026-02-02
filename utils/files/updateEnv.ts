import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Updates an environment variable in both the current process and the .env file.
 * @param key The environment variable key.
 * @param value The environment variable value.
 * @returns A promise that resolves to true if successful, or throws an error.
 */
export async function updateEnv(key: string, value: string): Promise<void> {
	process.env[key] = value;
	const envPath = join(process.cwd(), '.env');

	let envContent = '';
	if (existsSync(envPath)) {
		envContent = await readFile(envPath, 'utf-8');
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

	await writeFile(envPath, envContent);
}

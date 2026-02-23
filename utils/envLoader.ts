import dotenv from 'dotenv';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export function loadEnv() {
	const topLevelEnvPath = join(homedir(), '.harper', 'harper-agent-env');
	const localEnvPath = join(process.cwd(), '.env');

	// 1. Load top-level config (~/.harper/harper-agent-env)
	if (existsSync(topLevelEnvPath)) {
		dotenv.config({ path: topLevelEnvPath, quiet: true });
	}

	// 2. Load local config (.env), which merges and overrides
	if (existsSync(localEnvPath)) {
		dotenv.config({ path: localEnvPath, override: true, quiet: true });
	}
}

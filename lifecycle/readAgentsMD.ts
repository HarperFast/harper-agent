import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { trackedState } from './trackedState';

export function readAgentsMD(): string | undefined {
	const agentsMdExists = existsSync(join(trackedState.cwd, 'AGENTS.md'));
	if (agentsMdExists) {
		return readFileSync(join(trackedState.cwd, 'AGENTS.md'), 'utf8');
	}
}

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { agentsSkillReference } from './agentsSkillReference';
import { trackedState } from './trackedState';

export function readAgentSkillsRoot(): string | undefined {
	const agentsFile = join(trackedState.cwd, agentsSkillReference);
	const agentsMdExists = existsSync(agentsFile);
	if (agentsMdExists) {
		return readFileSync(agentsFile, 'utf8');
	}
}

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { trackedState } from './trackedState';

export function defaultInstructions(): string {
	const harperAppExists = existsSync(join(trackedState.cwd, 'config.yaml'));
	const vibing = harperAppExists ? 'updating' : 'creating';
	return `You are working on ${vibing} a harper app with the user.`;
}

import type { ModelProvider } from '../../ink/models/config';
import { getEnvVarForProvider } from './getEnvVarForProvider';
import { updateEnv } from './updateEnv';

export function updateEnvKeyForProvider(provider: ModelProvider, key: string) {
	const envVar = getEnvVarForProvider(provider);
	return updateEnv(envVar, key);
}

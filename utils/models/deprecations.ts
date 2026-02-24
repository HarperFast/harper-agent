import chalk from 'chalk';
import { updateEnv } from '../files/updateEnv';

/**
 * Generic model deprecation and redirection support.
 * Add new rules here to seamlessly redirect deprecated models
 * and persist the change for future runs.
 */
type EnvKey = 'HARPER_AGENT_MODEL' | 'HARPER_AGENT_COMPACTION_MODEL';

export interface DeprecationRule {
	/** Return true if the rule applies to this model name. */
	match: (modelName: string) => boolean;
	/** Replacement model to use. */
	replacement: string;
	/** Optional human-friendly reason to show in the warning. */
	reason?: string;
}

// Central registry of deprecation rules. Order matters: first match wins.
export const DEPRECATION_RULES: DeprecationRule[] = [
	// Redirect any gpt-4o variants (including dated and -mini) to gpt-5-nano
	{
		match: (name) => name.toLowerCase().startsWith('gpt-4o'),
		replacement: 'gpt-5-nano',
		reason: 'OpenAI gpt-4o family is deprecated in this agent',
	},
];

export function getDeprecatedReplacement(
	modelName: string | undefined,
): { replacement: string; rule: DeprecationRule } | null {
	if (!modelName) { return null; }
	for (const rule of DEPRECATION_RULES) {
		if (rule.match(modelName)) {
			return { replacement: rule.replacement, rule };
		}
	}
	return null;
}

export function warnAndPersistRedirect(original: string, envKey: EnvKey, replacement: string, reason?: string): void {
	const reasonSuffix = reason ? ` Reason: ${reason}.` : '';
	console.warn(
		chalk.yellow(
			`Warning: model "${original}" is deprecated and will be redirected to "${replacement}".`
				+ ` Your environment setting (${envKey}) has been updated.${reasonSuffix}`,
		),
	);
	updateEnv(envKey, replacement);
}

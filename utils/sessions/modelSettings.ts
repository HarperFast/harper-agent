import type { ModelSettings } from '@openai/agents';
import { trackedState } from '../../lifecycle/trackedState';

/**
 * Models that are known to not support 'low' text verbosity.
 * For these models, we automatically raise it to 'medium'.
 */
const modelsRequiringMediumVerbosity = [
	'gpt-4o',
];

export function getModelSettings(modelName: string): ModelSettings {
	const needsMedium = modelsRequiringMediumVerbosity.some(m => modelName.toLowerCase().includes(m.toLowerCase()));
	const verbosity = needsMedium ? 'medium' : 'low';

	return {
		parallelToolCalls: false,
		text: {
			verbosity,
		},
		providerData: {
			service_tier: trackedState.useFlexTier ? 'flex' : 'auto',
		},
	};
}

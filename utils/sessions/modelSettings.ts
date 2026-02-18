import type { ModelSettings } from '@openai/agents';
import { trackedState } from '../../lifecycle/trackedState';

/**
 * Models that are known to not support 'low' text verbosity.
 * For these models, we automatically raise it to 'medium'.
 */
const modelsRequiringMediumVerbosity = [
	'gpt-4o',
	'gpt-5',
];

export function getModelSettings(modelName?: string): ModelSettings {
	const name = modelName || trackedState.model;
	const needsMedium = modelsRequiringMediumVerbosity.some(m => name.toLowerCase().includes(m.toLowerCase()));
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

export function getCompactionModelSettings(modelName?: string): ModelSettings {
	return {
		...getModelSettings(modelName || trackedState.compactionModel),
		text: {
			verbosity: 'medium',
		},
	};
}

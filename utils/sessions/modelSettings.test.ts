import { describe, expect, it } from 'vitest';
import { trackedState } from '../../lifecycle/trackedState';
import { getCompactionModelSettings, getModelSettings } from './modelSettings';

describe('modelSettings', () => {
	it('should return low verbosity for unknown models', () => {
		const settings = getModelSettings('some-random-model');
		expect(settings.text?.verbosity).toBe('low');
	});

	it('should return medium verbosity for gpt-4o', () => {
		const settings = getModelSettings('gpt-4o');
		expect(settings.text?.verbosity).toBe('medium');
	});

	it('should return medium verbosity for gpt-4o-2024-05-13', () => {
		const settings = getModelSettings('gpt-4o-2024-05-13');
		expect(settings.text?.verbosity).toBe('medium');
	});

	it('should return medium verbosity for gpt-5 models', () => {
		const settings = getModelSettings('gpt-5.2');
		expect(settings.text?.verbosity).toBe('medium');
	});

	it('should respect trackedState.model if no model name is provided', () => {
		trackedState.model = 'gpt-4o';
		const settings = getModelSettings();
		expect(settings.text?.verbosity).toBe('medium');

		trackedState.model = 'claude-3';
		const settings2 = getModelSettings();
		expect(settings2.text?.verbosity).toBe('low');
	});

	it('should always return medium verbosity for compaction settings', () => {
		const settings = getCompactionModelSettings('some-random-model');
		expect(settings.text?.verbosity).toBe('medium');

		const settings2 = getCompactionModelSettings('gpt-4o');
		expect(settings2.text?.verbosity).toBe('medium');
	});

	it('should reflect trackedState.useFlexTier', () => {
		trackedState.useFlexTier = true;
		expect(getModelSettings().providerData?.service_tier).toBe('flex');

		trackedState.useFlexTier = false;
		expect(getModelSettings().providerData?.service_tier).toBe('auto');
	});
});

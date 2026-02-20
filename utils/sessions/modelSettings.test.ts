import { describe, expect, it } from 'vitest';
import { trackedState } from '../../lifecycle/trackedState';
import { getModelSettings } from './modelSettings';

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

	it('should not return medium verbosity for gpt-5 models', () => {
		const settings = getModelSettings('gpt-5.2');
		expect(settings.text?.verbosity).toBe('low');
	});

	it('should respect trackedState.model if no model name is provided', () => {
		const settings = getModelSettings('gpt-4o');
		expect(settings.text?.verbosity).toBe('medium');

		const settings2 = getModelSettings('claude-3');
		expect(settings2.text?.verbosity).toBe('low');
	});

	it('should reflect trackedState.useFlexTier', () => {
		trackedState.useFlexTier = true;
		expect(getModelSettings('gpt-5.2').providerData?.service_tier).toBe('flex');

		trackedState.useFlexTier = false;
		expect(getModelSettings('gpt-5.2').providerData?.service_tier).toBe('auto');
	});
});

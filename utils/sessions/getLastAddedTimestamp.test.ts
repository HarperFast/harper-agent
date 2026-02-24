import { user } from '@openai/agents';
import { describe, expect, it } from 'vitest';
import { getLastAddedTimestamp } from './getLastAddedTimestamp';

describe('getLastAddedTimestamp', () => {
	it('returns null for empty arrays', () => {
		expect(getLastAddedTimestamp([])).toBeNull();
	});

	it('returns the timestamp from the last item when present and finite', () => {
		const ts = Date.now();
		const items = [
			user('hello'),
			{ ...(user('world') as any), providerData: { harper: { addedAtMs: ts } } } as any,
		];
		expect(getLastAddedTimestamp(items as any)).toBe(ts);
	});

	it('returns null when the last item has no timestamp even if earlier items do', () => {
		const earlierTs = Date.now() - 1000;
		const items = [
			{ ...(user('earlier') as any), providerData: { harper: { addedAtMs: earlierTs } } } as any,
			user('latest without stamp'),
		];
		expect(getLastAddedTimestamp(items as any)).toBeNull();
	});

	it('returns null when the last item timestamp is not a number', () => {
		const items = [
			user('a'),
			{ ...(user('b') as any), providerData: { harper: { addedAtMs: 'now' } } } as any,
		];
		expect(getLastAddedTimestamp(items as any)).toBeNull();
	});

	it('returns null when the last item timestamp is not finite (e.g., Infinity)', () => {
		const items = [
			user('a'),
			{ ...(user('b') as any), providerData: { harper: { addedAtMs: Infinity } } } as any,
		];
		expect(getLastAddedTimestamp(items as any)).toBeNull();
	});

	it('defensively returns null for non-array inputs', () => {
		expect(getLastAddedTimestamp(null as any)).toBeNull();
		expect(getLastAddedTimestamp(undefined as any)).toBeNull();
	});
});

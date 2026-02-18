import { describe, expect, it } from 'vitest';
import { calculateCost, costTracker, extractCachedTokens, hasKnownPrices } from './cost';

describe('cost utilities', () => {
	describe('extractCachedTokens', () => {
		it('should extract cached tokens from an object', () => {
			expect(extractCachedTokens({ cached_tokens: 100 })).toBe(100);
		});

		it('should extract cached tokens from an array', () => {
			expect(extractCachedTokens([{ cached_tokens: 100 }, { cached_tokens: 50 }])).toBe(150);
		});

		it('should return 0 if no cached tokens are present', () => {
			expect(extractCachedTokens({ some_other_detail: 100 })).toBe(0);
			expect(extractCachedTokens(undefined)).toBe(0);
		});
	});

	describe('calculateCost', () => {
		it('should calculate cost correctly for gpt-5.2 in flex tier (default)', () => {
			// Prices: input: 0.875, output: 7.00 per 1M tokens
			const inputTokens = 1_000_000;
			const outputTokens = 1_000_000;
			const cost = calculateCost('gpt-5.2', inputTokens, outputTokens, undefined, 'flex');
			expect(cost).toBeCloseTo(0.875 + 7.00);
		});

		it('should calculate cost correctly for gpt-5.2 in standard tier', () => {
			// Prices: input: 1.75, output: 14.00 per 1M tokens
			const inputTokens = 1_000_000;
			const outputTokens = 1_000_000;
			const cost = calculateCost('gpt-5.2', inputTokens, outputTokens, undefined, 'standard');
			expect(cost).toBeCloseTo(1.75 + 14.00);
		});

		it('should handle cached tokens with different rates in flex tier', () => {
			// Prices: input: 0.875, cachedInput: 0.0875 per 1M tokens
			const inputTokens = 1_000_000;
			const cachedTokens = 500_000;
			const outputTokens = 0;
			const cost = calculateCost('gpt-5.2', inputTokens, outputTokens, { cached_tokens: cachedTokens }, 'flex');

			const expectedCost = (500_000 * (0.875 / 1_000_000)) + (500_000 * (0.0875 / 1_000_000));
			expect(cost).toBeCloseTo(expectedCost);
		});

		it('should return 0 cost if model is unknown in requested tier', () => {
			const costUnknown = calculateCost('gpt-4o-mini', 1_000_000, 0, undefined, 'flex');
			expect(costUnknown).toBe(0);
		});
	});

	describe('hasKnownPrices', () => {
		it('should return true for gpt-5.2 in flex tier', () => {
			expect(hasKnownPrices('gpt-5.2', 'flex')).toBe(true);
		});

		it('should return true for gpt-5.2 in standard tier', () => {
			expect(hasKnownPrices('gpt-5.2', 'standard')).toBe(true);
		});

		it('should return true for gpt-4o-mini in standard tier', () => {
			expect(hasKnownPrices('gpt-4o-mini', 'standard')).toBe(true);
		});

		it('should return false for gpt-4o-mini in flex tier', () => {
			expect(hasKnownPrices('gpt-4o-mini', 'flex')).toBe(false);
		});

		it('should return false for unknown models', () => {
			expect(hasKnownPrices('ollama-llama3')).toBe(false);
			expect(hasKnownPrices('claude-3-sonnet')).toBe(false);
		});
	});

	describe('CostTracker', () => {
		it('should record turns and track total cost', () => {
			costTracker.reset();
			const usage = {
				inputTokens: 1000,
				outputTokens: 100,
				inputTokensDetails: [],
				requestUsageEntries: [],
			};
			const cost = costTracker.recordTurn('gpt-5.2', usage);
			expect(cost).toBeGreaterThan(0);
		});

		it('should handle compaction costs with a specific model', () => {
			costTracker.reset();
			const usage = {
				inputTokens: 1000,
				outputTokens: 100,
				inputTokensDetails: [],
				requestUsageEntries: [
					{
						endpoint: 'responses.compact',
						inputTokens: 500,
						outputTokens: 50,
						totalTokens: 550,
						inputTokensDetails: [] as any,
						outputTokensDetails: [] as any,
					},
					{
						endpoint: 'chat.completions',
						inputTokens: 500,
						outputTokens: 50,
						totalTokens: 550,
						inputTokensDetails: [] as any,
						outputTokensDetails: [] as any,
					},
				],
			};

			const cost = costTracker.recordTurn('gpt-5.2', usage, 'gpt-4o-mini');
			expect(cost).toBeGreaterThan(0);
		});

		it('should hide status string if model is unknown', () => {
			costTracker.reset();
			const usage = {
				inputTokens: 1000,
				outputTokens: 100,
				inputTokensDetails: [],
				requestUsageEntries: [],
			};
			const status = costTracker.getStatusString(usage, 'ollama-llama3');
			expect(status).toBe('');
		});

		it('should hide status string if compaction model is unknown', () => {
			costTracker.reset();
			const usage = {
				inputTokens: 1000,
				outputTokens: 100,
				inputTokensDetails: [],
				requestUsageEntries: [
					{
						endpoint: 'responses.compact',
						inputTokens: 500,
						outputTokens: 50,
						totalTokens: 550,
						inputTokensDetails: [] as any,
						outputTokensDetails: [] as any,
					},
				],
			};
			const status = costTracker.getStatusString(usage, 'gpt-5.2', 'unknown-compaction');
			expect(status).toBe('');
		});

		it('should respect serviceTier property on usage entries', () => {
			costTracker.reset();
			const usage = {
				inputTokens: 1_000_000,
				outputTokens: 1_000_000,
				inputTokensDetails: [],
				requestUsageEntries: [
					{
						endpoint: 'chat.completions',
						inputTokens: 1_000_000,
						outputTokens: 1_000_000,
						totalTokens: 2_000_000,
						inputTokensDetails: [] as any,
						outputTokensDetails: [] as any,
						serviceTier: 'standard',
					} as any,
				],
			};

			const cost = costTracker.recordTurn('gpt-5.2', usage);
			// Standard prices: input: 1.75, output: 14.00 -> 15.75
			// Flex prices (default): input: 0.875, output: 7.00 -> 7.875
			expect(cost).toBeCloseTo(15.75);
		});

		it('should respect serviceTier=flex property on usage entries', () => {
			costTracker.reset();
			const usage = {
				inputTokens: 1_000_000,
				outputTokens: 1_000_000,
				inputTokensDetails: [],
				requestUsageEntries: [
					{
						endpoint: 'chat.completions',
						inputTokens: 1_000_000,
						outputTokens: 1_000_000,
						totalTokens: 2_000_000,
						inputTokensDetails: [] as any,
						outputTokensDetails: [] as any,
						serviceTier: 'flex',
					} as any,
				],
			};

			const cost = costTracker.recordTurn('gpt-5.2', usage);
			expect(cost).toBeCloseTo(7.875);
		});
	});
});

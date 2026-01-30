import { describe, expect, it } from 'vitest';
import { calculateCost, costTracker, extractCachedTokens } from './cost';

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
		it('should calculate cost correctly for gpt-5.2 (default prices)', () => {
			// Prices: input: 0.875, output: 7.00 per 1M tokens
			const inputTokens = 1_000_000;
			const outputTokens = 1_000_000;
			const cost = calculateCost('gpt-5.2', inputTokens, outputTokens, undefined);
			expect(cost).toBeCloseTo(0.875 + 7.00);
		});

		it('should handle cached tokens with different rates', () => {
			// Prices: input: 0.875, cachedInput: 0.0875 per 1M tokens
			const inputTokens = 1_000_000;
			const cachedTokens = 500_000;
			const outputTokens = 0;
			const cost = calculateCost('gpt-5.2', inputTokens, outputTokens, { cached_tokens: cachedTokens });

			const expectedCost = (500_000 * (0.875 / 1_000_000)) + (500_000 * (0.0875 / 1_000_000));
			expect(cost).toBeCloseTo(expectedCost);
		});

		it('should use default model if model is unknown', () => {
			const costUnknown = calculateCost('unknown-model', 1_000_000, 0, undefined);
			const costDefault = calculateCost('gpt-5.2', 1_000_000, 0, undefined);
			expect(costUnknown).toBe(costDefault);
		});
	});

	describe('CostTracker', () => {
		it('should record turns and track total cost', () => {
			const usage = {
				inputTokens: 1000,
				outputTokens: 100,
				inputTokensDetails: {},
			};
			const cost = costTracker.recordTurn('gpt-5.2', usage);
			expect(cost).toBeGreaterThan(0);
		});

		it('should handle compaction costs with a specific model', () => {
			const usage = {
				inputTokens: 1000,
				outputTokens: 100,
				inputTokensDetails: {},
				requestUsageEntries: [
					{
						endpoint: 'responses.compact',
						inputTokens: 500,
						outputTokens: 50,
						inputTokensDetails: {},
					},
					{
						endpoint: 'chat.completions',
						inputTokens: 500,
						outputTokens: 50,
						inputTokensDetails: {},
					},
				],
			};

			const cost = costTracker.recordTurn('gpt-5.2', usage, 'gpt-4o-mini');
			expect(cost).toBeGreaterThan(0);
		});
	});
});

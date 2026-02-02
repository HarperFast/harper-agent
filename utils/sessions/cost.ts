import type { Usage } from '@openai/agents';
import chalk from 'chalk';

export type ServiceTier = 'flex' | 'standard';

const FLEX_PRICES: Record<string, { input: number; cachedInput: number; output: number }> = {
	'gpt-5.2': { input: 0.875 / 1_000_000, cachedInput: 0.0875 / 1_000_000, output: 7.00 / 1_000_000 },
	'gpt-5.1': { input: 0.625 / 1_000_000, cachedInput: 0.0625 / 1_000_000, output: 5.00 / 1_000_000 },
	'gpt-5': { input: 0.625 / 1_000_000, cachedInput: 0.0625 / 1_000_000, output: 5.00 / 1_000_000 },
	'gpt-5-mini': { input: 0.125 / 1_000_000, cachedInput: 0.0125 / 1_000_000, output: 1.00 / 1_000_000 },
	'gpt-5-nano': { input: 0.025 / 1_000_000, cachedInput: 0.0025 / 1_000_000, output: 0.20 / 1_000_000 },
	'o3': { input: 1.00 / 1_000_000, cachedInput: 0.25 / 1_000_000, output: 4.00 / 1_000_000 },
	'o4-mini': { input: 0.55 / 1_000_000, cachedInput: 0.138 / 1_000_000, output: 2.20 / 1_000_000 },
};

const STANDARD_PRICES: Record<string, { input: number; cachedInput: number; output: number }> = {
	'gpt-5.2': { input: 1.75 / 1_000_000, cachedInput: 0.175 / 1_000_000, output: 14.00 / 1_000_000 },
	'gpt-5.1': { input: 1.25 / 1_000_000, cachedInput: 0.125 / 1_000_000, output: 10.00 / 1_000_000 },
	'gpt-5': { input: 1.25 / 1_000_000, cachedInput: 0.125 / 1_000_000, output: 10.00 / 1_000_000 },
	'gpt-5-mini': { input: 0.25 / 1_000_000, cachedInput: 0.025 / 1_000_000, output: 2.00 / 1_000_000 },
	'gpt-5-nano': { input: 0.05 / 1_000_000, cachedInput: 0.005 / 1_000_000, output: 0.40 / 1_000_000 },
	'gpt-5.2-chat-latest': { input: 1.75 / 1_000_000, cachedInput: 0.175 / 1_000_000, output: 14.00 / 1_000_000 },
	'gpt-5.1-chat-latest': { input: 1.25 / 1_000_000, cachedInput: 0.125 / 1_000_000, output: 10.00 / 1_000_000 },
	'gpt-5-chat-latest': { input: 1.25 / 1_000_000, cachedInput: 0.125 / 1_000_000, output: 10.00 / 1_000_000 },
	'gpt-5.2-pro': { input: 21.00 / 1_000_000, cachedInput: 21.00 / 1_000_000, output: 168.00 / 1_000_000 },
	'gpt-5-pro': { input: 15.00 / 1_000_000, cachedInput: 15.00 / 1_000_000, output: 120.00 / 1_000_000 },
	'gpt-4.1': { input: 2.00 / 1_000_000, cachedInput: 0.50 / 1_000_000, output: 8.00 / 1_000_000 },
	'gpt-4.1-mini': { input: 0.40 / 1_000_000, cachedInput: 0.10 / 1_000_000, output: 1.60 / 1_000_000 },
	'gpt-4.1-nano': { input: 0.10 / 1_000_000, cachedInput: 0.025 / 1_000_000, output: 0.40 / 1_000_000 },
	'gpt-4o': { input: 2.50 / 1_000_000, cachedInput: 1.25 / 1_000_000, output: 10.00 / 1_000_000 },
	'gpt-4o-2024-05-13': { input: 5.00 / 1_000_000, cachedInput: 5.00 / 1_000_000, output: 15.00 / 1_000_000 },
	'gpt-4o-mini': { input: 0.15 / 1_000_000, cachedInput: 0.075 / 1_000_000, output: 0.60 / 1_000_000 },
	'o1': { input: 15.00 / 1_000_000, cachedInput: 7.50 / 1_000_000, output: 60.00 / 1_000_000 },
	'o1-pro': { input: 150.00 / 1_000_000, cachedInput: 150.00 / 1_000_000, output: 600.00 / 1_000_000 },
	'o3-pro': { input: 20.00 / 1_000_000, cachedInput: 20.00 / 1_000_000, output: 80.00 / 1_000_000 },
	'o3': { input: 2.00 / 1_000_000, cachedInput: 0.50 / 1_000_000, output: 8.00 / 1_000_000 },
	'o3-deep-research': { input: 10.00 / 1_000_000, cachedInput: 2.50 / 1_000_000, output: 40.00 / 1_000_000 },
	'o4-mini': { input: 1.10 / 1_000_000, cachedInput: 0.275 / 1_000_000, output: 4.40 / 1_000_000 },
	'o4-mini-deep-research': { input: 2.00 / 1_000_000, cachedInput: 0.50 / 1_000_000, output: 8.00 / 1_000_000 },
	'o3-mini': { input: 1.10 / 1_000_000, cachedInput: 0.55 / 1_000_000, output: 4.40 / 1_000_000 },
	'o1-mini': { input: 1.10 / 1_000_000, cachedInput: 0.55 / 1_000_000, output: 4.40 / 1_000_000 },
};

const MODEL_PRICES: Record<ServiceTier, Record<string, { input: number; cachedInput: number; output: number }>> = {
	flex: FLEX_PRICES,
	standard: STANDARD_PRICES,
};

export function hasKnownPrices(model: string | null | undefined, tier: ServiceTier = 'flex'): boolean {
	const name = model || 'gpt-5.2';
	return name in MODEL_PRICES[tier];
}

export function extractCachedTokens(
	inputTokenDetails?: Array<Record<string, number>> | Record<string, number>,
): number {
	let cachedInputTokens = 0;
	if (inputTokenDetails) {
		const details = Array.isArray(inputTokenDetails) ? inputTokenDetails : [inputTokenDetails];
		for (const inputTokenDetail of details) {
			if (inputTokenDetail['cached_tokens']) {
				cachedInputTokens += inputTokenDetail['cached_tokens'];
			}
		}
	}
	return cachedInputTokens;
}

export function calculateCost(
	model: string | undefined,
	inputTokens: number,
	outputTokens: number,
	inputTokenDetails: Array<Record<string, number>> | Record<string, number> | undefined,
	tier: ServiceTier = 'flex',
): number {
	const prices = MODEL_PRICES[tier][model || 'gpt-5.2'];
	if (!prices) {
		return 0;
	}
	const cachedInputTokens = extractCachedTokens(inputTokenDetails);
	const fullRateInputTokens = inputTokens - cachedInputTokens;
	return fullRateInputTokens * prices.input
		+ cachedInputTokens * prices.cachedInput
		+ outputTokens * prices.output;
}

class CostTracker {
	private totalInputTokens = 0;
	private totalCachedInputTokens = 0;
	private totalOutputTokens = 0;
	private totalCost = 0;
	private totalCompactionCost = 0;
	private hasUnknownPrices = false;

	public reset() {
		this.totalInputTokens = 0;
		this.totalCachedInputTokens = 0;
		this.totalOutputTokens = 0;
		this.totalCost = 0;
		this.totalCompactionCost = 0;
		this.hasUnknownPrices = false;
	}

	public recordTurn(
		model: string,
		usage: Pick<Usage, 'requestUsageEntries' | 'outputTokens' | 'inputTokens' | 'inputTokensDetails'>,
		compactionModel?: string,
	) {
		const { turnCost, compactionCost, unknownPrices } = this.calculateUsageCosts(model, usage, compactionModel);
		this.totalInputTokens += usage.inputTokens;
		this.totalCachedInputTokens += extractCachedTokens(usage.inputTokensDetails);
		this.totalOutputTokens += usage.outputTokens;
		this.totalCost += turnCost;
		this.totalCompactionCost += compactionCost;
		if (unknownPrices) {
			this.hasUnknownPrices = true;
		}
		return turnCost + compactionCost;
	}

	private calculateUsageCosts(
		model: string,
		usage: Pick<Usage, 'requestUsageEntries' | 'outputTokens' | 'inputTokens' | 'inputTokensDetails'> | undefined,
		compactionModel?: string,
	): { turnCost: number; compactionCost: number; unknownPrices: boolean } {
		let turnCost = 0;
		let compactionCost = 0;
		let unknownPrices = !hasKnownPrices(model, 'flex');

		if (usage?.requestUsageEntries && usage.requestUsageEntries.length > 0) {
			for (const entry of usage.requestUsageEntries) {
				const isCompaction = entry.endpoint === 'responses.compact';
				const tier: ServiceTier = isCompaction ? 'standard' : 'flex';
				const entryModel = isCompaction ? (compactionModel || 'gpt-4o-mini') : model;
				if (!hasKnownPrices(entryModel, tier)) {
					unknownPrices = true;
				}
				const entryCost = calculateCost(
					entryModel,
					entry.inputTokens,
					entry.outputTokens,
					entry.inputTokensDetails,
					tier,
				);
				if (isCompaction) {
					compactionCost += entryCost;
				} else {
					turnCost += entryCost;
				}
			}
		} else if (usage) {
			turnCost = calculateCost(model, usage.inputTokens, usage.outputTokens, usage.inputTokensDetails, 'flex');
		}

		return { turnCost, compactionCost, unknownPrices };
	}

	public getStatusString(
		currentTurnUsage:
			| Pick<Usage, 'requestUsageEntries' | 'outputTokens' | 'inputTokens' | 'inputTokensDetails'>
			| undefined,
		model: string,
		compactionModel?: string,
	) {
		const { turnCost, compactionCost, unknownPrices } = this.calculateUsageCosts(
			model,
			currentTurnUsage,
			compactionModel,
		);
		if (this.hasUnknownPrices || unknownPrices) {
			return '';
		}
		const totalTurnCost = turnCost + compactionCost;
		return chalk.dim(
			`[~${chalk.cyan('$' + (this.totalCost + this.totalCompactionCost + totalTurnCost).toFixed(4))}]`,
		);
	}

	public logFinalStats() {
		if (this.totalInputTokens > 0 || this.totalOutputTokens > 0) {
			const fmt = (n: number) => new Intl.NumberFormat().format(n);
			const cachedStr = this.totalCachedInputTokens > 0
				? ` (${chalk.cyan(fmt(this.totalCachedInputTokens))} cached)`
				: '';
			const showCost = !this.hasUnknownPrices;
			const totalCost = this.totalCost + this.totalCompactionCost;
			let statsStr = chalk.dim(
				`Final session usage: ${chalk.cyan(fmt(this.totalInputTokens))} input${cachedStr}, ${
					chalk.cyan(fmt(this.totalOutputTokens))
				} output tokens.`,
			);

			if (showCost) {
				statsStr += chalk.dim(` Total cost: ~${chalk.cyan('$' + totalCost.toFixed(4))}`);
				if (this.totalCompactionCost > 0) {
					statsStr += chalk.dim(
						` (Compaction: ${chalk.cyan('$' + this.totalCompactionCost.toFixed(4))})`,
					);
				}
			}

			console.log(statsStr);
		}
	}
}

export const costTracker = new CostTracker();

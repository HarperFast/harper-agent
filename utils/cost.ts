import type { Usage } from '@openai/agents';
import chalk from 'chalk';

const MODEL_PRICES: Record<string, { input: number; cachedInput: number; output: number }> = {
	'gpt-5.2': { input: 0.875 / 1_000_000, cachedInput: 0.0875 / 1_000_000, output: 7.00 / 1_000_000 }, // flex tier (slower and less expensive)
};

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
): number {
	const prices = MODEL_PRICES[model || 'gpt-5.2'] || MODEL_PRICES['gpt-5.2']!;
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

	public recordTurn(
		model: string,
		usage: Usage,
		compactionModel?: string,
	) {
		const { turnCost, compactionCost } = this.calculateUsageCosts(model, usage, compactionModel);
		this.totalInputTokens += usage.inputTokens;
		this.totalCachedInputTokens += extractCachedTokens(usage.inputTokensDetails);
		this.totalOutputTokens += usage.outputTokens;
		this.totalCost += turnCost;
		this.totalCompactionCost += compactionCost;
		return turnCost + compactionCost;
	}

	private calculateUsageCosts(
		model: string,
		usage: Usage | undefined,
		compactionModel?: string,
	): { turnCost: number; compactionCost: number } {
		let turnCost = 0;
		let compactionCost = 0;

		if (usage?.requestUsageEntries && usage.requestUsageEntries.length > 0) {
			for (const entry of usage.requestUsageEntries) {
				const isCompaction = entry.endpoint === 'responses.compact';
				const entryCost = calculateCost(
					isCompaction ? (compactionModel || 'gpt-4o-mini') : model,
					entry.inputTokens,
					entry.outputTokens,
					entry.inputTokensDetails,
				);
				if (isCompaction) {
					compactionCost += entryCost;
				} else {
					turnCost += entryCost;
				}
			}
		} else if (usage) {
			turnCost = calculateCost(model, usage.inputTokens, usage.outputTokens, usage.inputTokensDetails);
		}

		return { turnCost, compactionCost };
	}

	public getStatusString(
		currentTurnUsage: Usage | undefined,
		model: string,
		compactionModel?: string,
	) {
		const { turnCost, compactionCost } = this.calculateUsageCosts(model, currentTurnUsage, compactionModel);
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
			const totalCost = this.totalCost + this.totalCompactionCost;
			let statsStr = chalk.dim(
				`Final session usage: ${chalk.cyan(fmt(this.totalInputTokens))} input${cachedStr}, ${
					chalk.cyan(fmt(this.totalOutputTokens))
				} output tokens. Total cost: ~${chalk.cyan('$' + totalCost.toFixed(4))}`,
			);

			if (this.totalCompactionCost > 0) {
				statsStr += chalk.dim(
					` (Compaction: ${chalk.cyan('$' + this.totalCompactionCost.toFixed(4))})`,
				);
			}

			console.log(statsStr);
		}
	}
}

export const costTracker = new CostTracker();

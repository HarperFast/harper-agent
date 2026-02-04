import {
	type AgentInputItem,
	type AssistantMessageItem,
	MemorySession,
	type Model,
	type OpenAIResponsesCompactionArgs,
	type OpenAIResponsesCompactionAwareSession,
	type OpenAIResponsesCompactionResult,
	type Session,
	system,
} from '@openai/agents';
import { excludeFalsy } from '../arrays/excludeFalsy';
import { getCompactionTriggerTokens } from './modelContextLimits';

export interface MemoryCompactionSessionOptions {
	underlyingSession?: Session;
	model: Model;
	// Optional: model name to determine context window for token-aware compaction
	modelName?: string;
	// Optional: fraction of context window at which to trigger compaction (0.5..0.95)
	triggerFraction?: number;
}

/**
 * A session that triggers compaction when a certain number of items are added.
 * This is intended for use with non-OpenAI models where OpenAI's built-in
 * compaction is not available.
 */
export class MemoryCompactionSession implements OpenAIResponsesCompactionAwareSession {
	private readonly underlyingSession: Session;
	private readonly model: Model;
	private readonly triggerTokens?: number;
	private itemsAddedSinceLastCompaction: number = 0;

	constructor(options: MemoryCompactionSessionOptions) {
		this.underlyingSession = options.underlyingSession ?? new MemorySession();
		this.model = options.model;
		// Compute token-based trigger if modelName provided
		if (options.modelName) {
			const fraction = options.triggerFraction ?? 0.8;
			this.triggerTokens = getCompactionTriggerTokens(options.modelName, fraction);
		}
	}

	async getSessionId(): Promise<string> {
		return this.underlyingSession.getSessionId();
	}

	async getItems(limit?: number): Promise<AgentInputItem[]> {
		return this.underlyingSession.getItems(limit);
	}

	async addItems(items: AgentInputItem[]): Promise<void> {
		await this.underlyingSession.addItems(items);
		this.itemsAddedSinceLastCompaction += items.length;
		// Proactively invoke compaction entry point; runCompaction will decide
		// whether a compaction is actually needed based on token thresholds.
		await this.runCompaction({ reason: 'post-add-check', mode: 'auto' } as any);
	}

	async popItem(): Promise<AgentInputItem | undefined> {
		return this.underlyingSession.popItem();
	}

	async clearSession(): Promise<void> {
		this.itemsAddedSinceLastCompaction = 0;
		await this.underlyingSession.clearSession();
	}

	/**
	 * Compaction entry point used by the underlying agent.
	 * This method first decides if compaction is necessary (token-aware gating),
	 * and only then performs the compaction. External callers should invoke this
	 * method directly; there is no separate "maybe" helper anymore.
	 *
	 * Behavior:
	 * - If a token trigger threshold is configured (via modelName), compaction is
	 *   skipped unless the estimated token count exceeds the threshold, unless a
	 *   forcing flag is provided in args.
	 * - If history is trivially small (<= 6 items), it skips compaction.
	 * - Otherwise, it keeps the first item, adds a compaction notice (optionally
	 *   summarized by the model), and retains the last 5 recent items.
	 */
	async runCompaction(args?: OpenAIResponsesCompactionArgs): Promise<OpenAIResponsesCompactionResult | null> {
		const items = await this.underlyingSession.getItems();

		if (items.length <= 1) {
			return null;
		}

		// Decide if compaction is needed based on token threshold unless forced.
		const force = !!(args as any)?.force || !!(args as any)?.always || (args as any)?.trigger === 'force';
		if (!force && this.triggerTokens && this.triggerTokens > 0) {
			const tokenEstimate = estimateTokens(items);
			if (tokenEstimate < this.triggerTokens) {
				return null; // below threshold, skip compaction
			}
		}

		// Keep the first item to maintain core instructions
		const firstItem = items[0];
		// Keep the last 5 items to maintain some recent context
		const recentItems = items.slice(-5);

		// If we are already below or at a small number of items, no need to clear/add
		if (items.length <= 6) {
			return null;
		}

		let compactionNoticeContent = '... conversation history compacted ...';

		if (this.model) {
			try {
				const response = await this.model.getResponse({
					input: items,
					systemInstructions:
						'Summarize the conversation history so far into a single concise paragraph. Focus on the key facts and decisions made.',
					modelSettings: {},
					tools: [],
					outputType: 'text',
					handoffs: [],
					tracing: false,
				});

				const summary = response.output
					.flatMap((o) => {
						if ('role' in o && o.role === 'assistant') {
							const assistantMsg = o as AssistantMessageItem;
							return assistantMsg.content
								.filter((c) => c.type === 'output_text')
								.map((c) => c.text);
						}
						return [];
					})
					.join('\n');

				if (summary) {
					compactionNoticeContent = `... conversation history compacted: ${summary} ...`;
				}
			} catch (error) {
				// Fallback to simple notice if model fails
				console.error('Failed to run model-based compaction:', error);
			}
		}

		// Reset the counter only when we actually compact
		this.itemsAddedSinceLastCompaction = 0;

		await this.underlyingSession.clearSession();

		// We add a system message indicating that history was compacted
		const compactionNotice = system(compactionNoticeContent);

		await this.underlyingSession.addItems([firstItem, compactionNotice, ...recentItems].filter(excludeFalsy));

		return null;
	}
}

// Rough token estimator: ~4 chars per token heuristic across text content
function estimateTokens(items: AgentInputItem[]): number {
	let chars = 0;
	for (const it of items as any[]) {
		if (!it) { continue; }
		// message-style with content array
		if (Array.isArray((it as any).content)) {
			for (const c of (it as any).content) {
				if (!c) { continue; }
				if (typeof c.text === 'string') { chars += c.text.length; }
				else if (typeof c.content === 'string') { chars += c.content.length; }
				else if (typeof c === 'string') { chars += c.length; }
			}
		}
		// single string content
		if (typeof (it as any).content === 'string') {
			chars += (it as any).content.length;
		}
		if (typeof (it as any).text === 'string') {
			chars += (it as any).text.length;
		}
	}
	return Math.ceil(chars / 4);
}

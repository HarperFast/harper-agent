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

export interface MemoryCompactionSessionOptions {
	underlyingSession?: Session;
	threshold?: number;
	model: Model;
}

/**
 * A session that triggers compaction when a certain number of items are added.
 * This is intended for use with non-OpenAI models where OpenAI's built-in
 * compaction is not available.
 */
export class MemoryCompactionSession implements OpenAIResponsesCompactionAwareSession {
	private readonly underlyingSession: Session;
	private readonly threshold: number;
	private readonly model: Model;
	private itemsAddedSinceLastCompaction: number = 0;

	constructor(options: MemoryCompactionSessionOptions) {
		this.underlyingSession = options.underlyingSession ?? new MemorySession();
		this.threshold = options.threshold ?? 20;
		this.model = options.model;
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

		// We check threshold here as well to ensure we don't grow too large
		// if many items are added at once outside of a 'run' loop.
		if (this.itemsAddedSinceLastCompaction >= this.threshold) {
			await this.runCompaction();
		}
	}

	async popItem(): Promise<AgentInputItem | undefined> {
		return this.underlyingSession.popItem();
	}

	async clearSession(): Promise<void> {
		this.itemsAddedSinceLastCompaction = 0;
		await this.underlyingSession.clearSession();
	}

	/**
	 * Run compaction on the session history.
	 * For now, this performs a simple truncation, keeping the first item
	 * and the most recent items.
	 */
	async runCompaction(_args?: OpenAIResponsesCompactionArgs): Promise<OpenAIResponsesCompactionResult | null> {
		const items = await this.underlyingSession.getItems();

		if (items.length <= 1) {
			return null;
		}

		// Reset the counter
		this.itemsAddedSinceLastCompaction = 0;

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

		await this.underlyingSession.clearSession();

		// We add a system message indicating that history was compacted
		const compactionNotice = system(compactionNoticeContent);

		await this.underlyingSession.addItems([firstItem, compactionNotice, ...recentItems].filter(excludeFalsy));

		return null;
	}
}

import {
	type AgentInputItem,
	MemorySession,
	type OpenAIResponsesCompactionArgs,
	type OpenAIResponsesCompactionAwareSession,
	type OpenAIResponsesCompactionResult,
	type Session,
} from '@openai/agents';
import { trackedState } from '../../lifecycle/trackedState';
import type { WithSkillsRead } from '../../lifecycle/withSkillsRead';
import { excludeFalsy } from '../arrays/excludeFalsy';
import { compactConversation } from './compactConversation';
import { getCompactionTriggerTokens } from './modelContextLimits';

export interface MemoryCompactionSessionOptions {
	underlyingSession?: Session;
	triggerFraction?: number;
}

/**
 * A session that triggers compaction when a certain number of items are added.
 * This is intended for use with non-OpenAI models where OpenAI's built-in
 * compaction is not available.
 */
export class MemoryCompactionSession implements OpenAIResponsesCompactionAwareSession, WithSkillsRead {
	private readonly underlyingSession: Session;
	private readonly triggerTokens?: number;
	private itemsAddedSinceLastCompaction: number = 0;
	private skillsReadLocal: Set<string> = new Set();

	constructor(options: MemoryCompactionSessionOptions) {
		this.underlyingSession = options.underlyingSession ?? new MemorySession();
		if (trackedState.compactionModel) {
			const fraction = options.triggerFraction ?? 0.5;
			this.triggerTokens = getCompactionTriggerTokens(trackedState.compactionModel, fraction);
		}
	}

	async getSessionId(): Promise<string> {
		return this.underlyingSession.getSessionId();
	}

	async addSkillRead(skill: string): Promise<void> {
		const u = this.underlyingSession as unknown as WithSkillsRead;
		if (u && typeof u.addSkillRead === 'function') {
			return u.addSkillRead(skill);
		}
		this.skillsReadLocal.add(skill);
	}

	async getSkillsRead(): Promise<string[]> {
		const u = this.underlyingSession as unknown as WithSkillsRead;
		let base: string[] = [];
		if (u && typeof u.getSkillsRead === 'function') {
			try {
				base = await Promise.resolve(u.getSkillsRead());
			} catch {}
		}
		const merged = new Set<string>([...base, ...this.skillsReadLocal]);
		return Array.from(merged);
	}

	async getItems(limit?: number): Promise<AgentInputItem[]> {
		// Return sanitized items so provider-specific metadata doesn't leak to upstream APIs.
		const items = await this.underlyingSession.getItems(limit);
		return (items as any[]).map((it) => sanitizeItem(it)) as AgentInputItem[];
	}

	/**
	 * Returns the provider-stamped timestamp of the latest-added item, or null when unavailable.
	 * Uses the underlying session directly to access our providerData without sanitation.
	 */
	async getLatestAddedTimestamp(): Promise<number | null> {
		const items = await this.underlyingSession.getItems();
		if (!Array.isArray(items) || items.length === 0) { return null; }
		const last: any = items[items.length - 1];
		const ts = last?.providerData?.harper?.addedAtMs;
		return (typeof ts === 'number' && Number.isFinite(ts)) ? ts : null;
	}

	async addItems(items: AgentInputItem[]): Promise<void> {
		// Stamp each item with a providerData timestamp under our provider key.
		// We avoid mutating the original objects by shallow-cloning.
		const now = Date.now();
		const stamped: AgentInputItem[] = (items as any[]).map((it) => {
			const pd = { ...it?.providerData } as Record<string, any>;
			const ours = { ...pd['harper'] } as Record<string, any>;
			// Record the wall-clock time when the item was added to the session.
			ours.addedAtMs = now;
			pd['harper'] = ours;
			return { ...it, providerData: pd } as AgentInputItem as any;
		});
		await this.underlyingSession.addItems(stamped);
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
	 * - If history is trivially small (<= 4 items), it skips compaction.
	 * - Otherwise, it keeps the first item, adds a compaction notice (optionally
	 *   summarized by the model), and retains the last 3 recent items.
	 */
	async runCompaction(args?: OpenAIResponsesCompactionArgs): Promise<OpenAIResponsesCompactionResult | null> {
		// Use sanitized view of history for compaction operations and token estimates.
		const items = await this.getItems();

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

		// If we are already below or at a small number of items, no need to clear/add
		if (items.length <= 4) {
			return null;
		}

		const { itemsToAdd } = await compactConversation(items);

		// Reset the counter only when we actually compact
		this.itemsAddedSinceLastCompaction = 0;

		await this.underlyingSession.clearSession();

		await this.underlyingSession.addItems(itemsToAdd.filter(excludeFalsy));

		return null;
	}
}

function sanitizeItem<T extends Record<string, any>>(it: T): T {
	if (!it || typeof it !== 'object') { return it; }
	const out: any = { ...it };
	// Remove any stray top-level 'harper' key just in case
	if ('harper' in out) {
		try {
			delete out.harper;
		} catch {}
	}
	const pd = out.providerData && typeof out.providerData === 'object' ? { ...out.providerData } : undefined;
	if (pd) {
		if ('harper' in pd) {
			try {
				delete (pd as any).harper;
			} catch {}
		}
		// If providerData ends up empty, drop it to avoid sending empty objects upstream
		if (Object.keys(pd).length === 0) {
			try {
				delete out.providerData;
			} catch {
				out.providerData = undefined;
			}
		} else {
			out.providerData = pd;
		}
	}
	return out as T;
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

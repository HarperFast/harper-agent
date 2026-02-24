import type { AgentInputItem } from '@openai/agents';

export function getLastAddedTimestamp(items: AgentInputItem[]): number | null {
	if (!Array.isArray(items) || items.length === 0) { return null; }
	const last: any = items[items.length - 1];
	const ts = last?.providerData?.harper?.addedAtMs;
	return (typeof ts === 'number' && Number.isFinite(ts)) ? ts : null;
}

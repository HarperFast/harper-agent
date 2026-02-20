import { Agent, type AgentInputItem, run, system } from '@openai/agents';
import { getModel, isOpenAIModel } from '../../lifecycle/getModel';
import { trackedState } from '../../lifecycle/trackedState';
import { excludeFalsy } from '../arrays/excludeFalsy';
import { getModelSettings } from './modelSettings';

export interface CompactionArtifacts {
	noticeContent: string;
	itemsToAdd: AgentInputItem[]; // [firstItem, system(notice), ...recentItems]
}

/**
 * Performs the core compaction transformation given the full items list.
 * Keeps the first item, inserts a system compaction notice (with an optional
 * model-generated summary), and retains the last 3 items.
 */
export async function compactConversation(
	items: AgentInputItem[],
): Promise<CompactionArtifacts> {
	const recentItems = items.slice(-3);
	const itemsToCompact = items.slice(0, -3);

	let noticeContent = '... conversation history compacted ...';

	if (trackedState.compactionModel && itemsToCompact.length > 0) {
		try {
			const agent = new Agent({
				name: 'History Compactor',
				model: isOpenAIModel(trackedState.compactionModel)
					? trackedState.compactionModel
					: getModel(trackedState.compactionModel),
				modelSettings: getModelSettings(trackedState.compactionModel),
				instructions: 'Compact the provided conversation history into key observations. '
					+ 'Focus on what seems likely to be needed later. '
					+ 'Be concise and avoid repeating information.',
			});
			const result = await run(
				agent,
				itemsToCompact,
			);

			const summary = result.finalOutput;
			if (summary && summary.trim().length > 0) {
				// Collapse excessive whitespace and make the notice compact
				const s = summary.replace(/\s+/g, ' ').trim();
				noticeContent = `Key observations from earlier:\n${s}`;
			}
		} catch (err: any) {
			// Keep default notice if summarization fails. Suppress noisy tracing errors
			// like "No existing trace found" which can occur when compaction runs
			// outside an active tracing span. Log other errors at warn level.
			const msg = String(err?.message || err || '');
			const isNoTrace = /no existing trace found/i.test(msg) || /setCurrentSpan/i.test(msg);
			if (!isNoTrace) {
				// eslint-disable-next-line no-console
				console.warn('Compaction summarization failed:', msg);
			}
		}
	}

	const itemsToAdd: AgentInputItem[] = [system(noticeContent), ...recentItems].filter(excludeFalsy);
	return { noticeContent, itemsToAdd };
}

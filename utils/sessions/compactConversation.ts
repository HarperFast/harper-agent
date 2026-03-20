import { Agent, type AgentInputItem, run, system } from '@openai/agents';
import { emitToListeners } from '../../ink/emitters/listener';
import { getModel, getModelName, getProvider, isOpenAIModel } from '../../lifecycle/getModel';
import { trackedState } from '../../lifecycle/trackedState';
import { excludeFalsy } from '../arrays/excludeFalsy';
import { estimateTokens } from '../models/estimateTokens';
import { splitItemsIntelligently } from '../models/splitItemsIntelligently';
import { ensureOllamaModel } from '../ollama/ensureOllamaModel';
import { getModelContextLimit } from './modelContextLimits';
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
	const { itemsToCompact, recentItems } = splitItemsIntelligently(items);

	const contextLimit = getModelContextLimit(trackedState.compactionModel);
	const targetLimit = Math.floor(contextLimit * 0.9); // Use 90% of limit to be safe

	let noticeContent = '... conversation history compacted ...';

	if (trackedState.compactionModel && itemsToCompact.length > 0) {
		try {
			if (getProvider(trackedState.compactionModel) === 'Ollama') {
				const modelName = getModelName(trackedState.compactionModel);
				await ensureOllamaModel(modelName, (progress) => {
					emitToListeners('SetPulling', {
						modelName,
						status: progress.status,
						completed: progress.completed ?? 0,
						total: progress.total ?? 0,
					});
				});
				emitToListeners('SetPulling', null);
			}

			const agent = new Agent({
				name: 'History Compactor',
				model: isOpenAIModel(trackedState.compactionModel)
					? trackedState.compactionModel
					: getModel(trackedState.compactionModel),
				modelSettings: getModelSettings(trackedState.compactionModel),
				instructions: 'Compact the provided conversation history.'
					+ '\n- Focus on what is NOT completed and needs to be remembered for later.'
					+ '\n- Do NOT include file content or patches, it is available on the filesystem already. '
					+ '\n- Be concise.',
			});

			const summaries: string[] = [];
			let remainingItems = itemsToCompact;

			while (remainingItems.length > 0) {
				let currentBatch: AgentInputItem[] = [];
				let lastGoodBatch: AgentInputItem[] = [];
				let splitIdx = remainingItems.length;

				// Find a batch that fits in the context window
				while (splitIdx > 0) {
					currentBatch = remainingItems.slice(0, splitIdx);
					if (estimateTokens(currentBatch) <= targetLimit) {
						lastGoodBatch = currentBatch;
						break;
					}
					// Reduce batch size and try again
					splitIdx = Math.floor(splitIdx * 0.8);
				}

				if (lastGoodBatch.length === 0) {
					// Even a single item might be too large if it contains a massive file.
					// Just take the first item and hope for the best, or skip it.
					lastGoodBatch = [remainingItems[0]!];
					splitIdx = 1;
				}

				emitToListeners('SetCompacting', true);
				const result = await run(
					agent,
					lastGoodBatch,
				);

				const summary = result.finalOutput;
				if (summary && summary.trim().length > 0) {
					summaries.push(summary.trim());
				}

				remainingItems = remainingItems.slice(splitIdx);
			}

			if (summaries.length > 0) {
				noticeContent = `Key observations from earlier:\n${summaries.join('\n\n')}`;
			}
		} catch (err: any) {
			// If we still fail, try to build a useful notice even without AI
			const msg = String(err?.message || err || '');
			const isNoTrace = /no existing trace found/i.test(msg) || /setCurrentSpan/i.test(msg);
			if (!isNoTrace) {
				// eslint-disable-next-line no-console
				console.warn('Compaction summarization failed:', msg);
			}

			// Better fallback notice
			const totalItems = itemsToCompact.length;
			const toolCalls = itemsToCompact.filter((it: any) => it.type === 'function_call').length;
			noticeContent = `... conversation history compacted (${totalItems} items, ${toolCalls} tool calls) ...`;
		} finally {
			emitToListeners('SetCompacting', false);
		}
	}

	const itemsToAdd: AgentInputItem[] = [system(noticeContent), ...recentItems].filter(excludeFalsy);
	return { noticeContent, itemsToAdd };
}

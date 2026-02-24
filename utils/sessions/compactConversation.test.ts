import { run, system, user } from '@openai/agents';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { trackedState } from '../../lifecycle/trackedState';
import { compactConversation } from './compactConversation';

vi.mock('@openai/agents', async () => {
	const actual = await vi.importActual<typeof import('@openai/agents')>('@openai/agents');
	return {
		...actual,
		run: vi.fn().mockResolvedValue({ finalOutput: 'Key facts decided.' }),
	};
});

describe('compactConversation utility', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Ensure the implementation takes the compaction path
		trackedState.compactionModel = 'gpt-5-nano';
		// Default mocked summary
		(run as any).mockResolvedValue({ finalOutput: 'Key facts decided.' });
	});

	afterEach(() => {
		trackedState.compactionModel = '';
	});

	it('builds compacted items with a model-based summary in the notice', async () => {
		const items = [
			system('instructions'),
			user('u1'),
			user('u2'),
			user('u3'),
			user('u4'),
			user('u5'),
			user('u6'),
		];

		const { noticeContent, itemsToAdd } = await compactConversation(items as any);

		expect(noticeContent).toMatch(/Key observations from earlier:/i);
		expect(noticeContent).toMatch(/Key facts decided\./);

		// key observations + last 3
		expect(itemsToAdd.length).toBe(4);
		expect((itemsToAdd[0] as any).role).toBe('system');
		expect((itemsToAdd[1] as any).role).toBe('user');

		const lastThree = itemsToAdd.slice(-3).map((it: any) => it.content?.[0]?.text ?? it.content);
		expect(lastThree).toEqual(['u4', 'u5', 'u6']);

		expect(run as any).toHaveBeenCalledWith(expect.anything(), items.slice(0, -3));
	});

	it('falls back to default notice if model throws', async () => {
		(run as any).mockRejectedValueOnce(new Error('bang'));
		const items = [
			system('instructions'),
			user('u1'),
			user('u2'),
			user('u3'),
			user('u4'),
			user('u5'),
			user('u6'),
		];

		const { noticeContent } = await compactConversation(items as any);
		expect(noticeContent).toBe('... conversation history compacted ...');
	});
});

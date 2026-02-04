import { MemorySession, type Model, system, user } from '@openai/agents';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryCompactionSession } from './MemoryCompactionSession';

describe('MemoryCompactionSession', () => {
	let underlyingSession: MemorySession;
	let session: MemoryCompactionSession;
	const mockModel = {
		getResponse: vi.fn().mockResolvedValue({
			output: [{
				type: 'message',
				role: 'assistant',
				status: 'completed',
				content: [{ type: 'output_text', text: 'This is a summary.' }],
			}],
			usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
		}),
	} as unknown as Model;

	beforeEach(() => {
		underlyingSession = new MemorySession();
		session = new MemoryCompactionSession({
			underlyingSession,
			model: mockModel,
			// Use a modelName with a huge context so token-trigger is not hit in tests
			modelName: 'gpt-5-test',
			triggerFraction: 0.8,
		});
	});

	it('should add items and track them', async () => {
		await session.addItems([user('hello')]);
		const items = await session.getItems();
		expect(items).toHaveLength(1);
		expect(items[0]).toEqual(user('hello'));
	});

	it('does not auto-compact when history is small (<= 6 items)', async () => {
		await session.addItems([
			system('instructions'),
			user('msg 1'),
			user('msg 2'),
		]);

		const items = await session.getItems();
		// It shouldn't compact because length <= 6 in the implementation.
		expect(items).toHaveLength(3);
	});

	it('forces compaction when requested and history is larger (> 6 items)', async () => {
		// Build a history of 7 items: 1 system + 6 users
		await session.addItems([
			system('instructions'),
			user('u1'),
			user('u2'),
			user('u3'),
			user('u4'),
			user('u5'),
			user('u6'),
		]);

		// Force compaction regardless of token threshold
		await session.runCompaction({ force: true } as any);

		const items = await session.getItems();
		// After compaction: first item + compaction notice + last 5 items => 7 total
		expect(items.length).toBe(7);
		// First item should remain the original system message
		expect((items[0] as any).role).toBe('system');
		expect((items[0] as any).content?.[0]?.text ?? (items[0] as any).content).toContain('instructions');
		// Second item should be the compaction notice (a system message containing 'compacted')
		expect((items[1] as any).role).toBe('system');
		const noticeText = (items[1] as any).content?.[0]?.text ?? (items[1] as any).content;
		expect(String(noticeText)).toMatch(/compacted/i);
		// Last 5 items should be the last five user messages (u2..u6)
		const lastFive = items.slice(-5).map((it: any) => it.content?.[0]?.text ?? it.content);
		expect(lastFive).toEqual(['u2', 'u3', 'u4', 'u5', 'u6']);
		// Model-based summarization should have been attempted
		expect(mockModel.getResponse).toHaveBeenCalled();
	});

	it('should clear session items on clearSession', async () => {
		await session.addItems([user('1'), user('2')]);
		await session.clearSession();
		const items = await session.getItems();
		expect(items).toHaveLength(0);

		await session.addItems([user('3')]);
		const itemsAfter = await session.getItems();
		expect(itemsAfter).toHaveLength(1);
	});
});

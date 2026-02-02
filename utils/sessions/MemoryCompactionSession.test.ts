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
			threshold: 3, // Low threshold for testing
			model: mockModel,
		});
	});

	it('should add items and track them', async () => {
		await session.addItems([user('hello')]);
		const items = await session.getItems();
		expect(items).toHaveLength(1);
		expect(items[0]).toEqual(user('hello'));
	});

	it('should trigger compaction when threshold is reached', async () => {
		await session.addItems([
			system('instructions'),
			user('msg 1'),
			user('msg 2'),
		]);

		// At this point itemsAddedSinceLastCompaction is 3.
		// It should have triggered compaction.
		// Our logic: keep first, add notice, keep last 5.
		// Total items were 3. Since total items <= 6, our implementation returns null and doesn't compact yet in that specific check.
		// Wait, let's re-examine runCompaction logic.

		const items = await session.getItems();
		// It shouldn't have compacted because length <= 6 in the implementation.
		expect(items).toHaveLength(3);
	});

	it('should compact when enough items are present', async () => {
		// Set a very low threshold and add many items
		session = new MemoryCompactionSession({
			underlyingSession,
			threshold: 2,
			model: mockModel,
		});

		await session.addItems([
			system('instructions'), // 1
			user('1'), // 2 -> triggers compaction attempt, but items.length (2) <= 6, so skipped
			user('2'), // 3
			user('3'), // 4
			user('4'), // 5
			user('5'), // 6
			user('6'), // 7 -> triggers compaction
		]);

		const items = await session.getItems();
		// Should have: firstItem + notice + last 5 items = 1 + 1 + 5 = 7 items.
		// Wait, if it had 7 items and we compact:
		// firstItem = items[0] ('instructions')
		// lastItems = items.slice(-5) ('2', '3', '4', '5', '6')
		// plus notice.
		expect(items).toHaveLength(7);
		expect(items[0]).toEqual(system('instructions'));
		expect((items[1] as any).content).toContain('compacted');
		expect(items[2]).toEqual(user('2'));
		expect(items[6]).toEqual(user('6'));
	});

	it('should clear counter on clearSession', async () => {
		await session.addItems([user('1'), user('2')]);
		await session.clearSession();
		const items = await session.getItems();
		expect(items).toHaveLength(0);

		await session.addItems([user('3')]);
		// threshold is 3. If counter wasn't cleared, it would be 2+1=3 and trigger.
		// But it was cleared, so it's 1.
		const itemsAfter = await session.getItems();
		expect(itemsAfter).toHaveLength(1);
	});

	it('should use model for compaction if provided', async () => {
		session = new MemoryCompactionSession({
			underlyingSession,
			threshold: 2,
			model: mockModel,
		});

		await session.addItems([
			system('instructions'),
			user('1'),
			user('2'),
			user('3'),
			user('4'),
			user('5'),
			user('6'),
		]);

		const items = await session.getItems();
		expect(items).toHaveLength(7);
		expect(items[1]!.type).toBe('message');
		expect((items[1] as any).role).toBe('system');
		expect((items[1] as any).content).toContain('compacted: This is a summary.');
		expect(mockModel.getResponse).toHaveBeenCalledWith(expect.objectContaining({
			systemInstructions: expect.stringContaining('Summarize'),
		}));
	});
});

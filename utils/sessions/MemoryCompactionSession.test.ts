import { MemorySession, run, system, user } from '@openai/agents';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { trackedState } from '../../lifecycle/trackedState';
import { MemoryCompactionSession } from './MemoryCompactionSession';

vi.mock('@openai/agents', async () => {
	const actual = await vi.importActual<typeof import('@openai/agents')>('@openai/agents');
	return {
		...actual,
		run: vi.fn().mockResolvedValue({ finalOutput: 'This is a summary.' }),
	};
});

describe('MemoryCompactionSession', () => {
	let underlyingSession: MemorySession;
	let session: MemoryCompactionSession;

	beforeEach(() => {
		vi.clearAllMocks();
		trackedState.compactionModel = 'gpt-5-nano';
		underlyingSession = new MemorySession();
		session = new MemoryCompactionSession({
			underlyingSession,
			triggerFraction: 0.8,
		});
	});

	afterEach(() => {
		trackedState.compactionModel = '';
	});

	it('should add items and track them', async () => {
		await session.addItems([user('hello')]);
		const items = await session.getItems();
		expect(items).toHaveLength(1);
		const first: any = items[0];
		expect(first.type).toBe('message');
		expect(first.role).toBe('user');
		// Content equivalence
		const content = Array.isArray(first.content) ? first.content[0]?.text : first.content;
		expect(content).toBe('hello');
		// Our provider data should be stripped from getItems
		expect(first?.providerData?.harper).toBeUndefined();
	});

	it('getLatestAddedTimestamp returns a recent timestamp', async () => {
		const before = Date.now();
		await session.addItems([user('ts-check-1'), user('ts-check-2')]);
		const ts = await session.getLatestAddedTimestamp();
		expect(typeof ts).toBe('number');
		expect(ts!).toBeGreaterThanOrEqual(before);
		expect(ts!).toBeLessThanOrEqual(Date.now());
	});

	it('should use default fraction of 0.5 when not specified', async () => {
		const defaultSession = new MemoryCompactionSession({ underlyingSession: new MemorySession() });
		// gpt-5-nano limit is 200,000. 200,000 * 0.5 = 100,000
		expect((defaultSession as any).triggerTokens).toBe(100_000);
	});

	it('does not auto-compact when history is small (<= 4 items)', async () => {
		await session.addItems([
			system('instructions'),
			user('msg 1'),
			user('msg 2'),
		]);

		const items = await session.getItems();
		// It shouldn't compact because length <= 4 in the implementation.
		expect(items).toHaveLength(3);
	});

	it('forces compaction when requested and history is larger (> 4 items)', async () => {
		// Build a history of 5 items: 1 system + 4 users
		await session.addItems([
			system('instructions'),
			user('u1'),
			user('u2'),
			user('u3'),
			user('u4'),
		]);

		// Force compaction regardless of token threshold
		await session.runCompaction({ force: true } as any);

		const items = await session.getItems();
		// After compaction: compaction notice + last 3 items => 4 total
		expect(items.length).toBe(4);
		expect((items[0] as any).role).toBe('system');
		expect((items[0] as any).content?.[0]?.text ?? (items[0] as any).content).toContain(
			'Key observations from earlier:',
		);
		// Last 3 items should be the last three user messages (u2..u4)
		const lastThree = items.slice(-3).map((it: any) => it.content?.[0]?.text ?? it.content);
		expect(lastThree).toEqual(['u2', 'u3', 'u4']);
		// Model-based summarization should have been attempted
		expect(run).toHaveBeenCalled();
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

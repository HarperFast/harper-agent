import { user } from '@openai/agents';
import { existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DiskSession } from './DiskSession';

describe('DiskSession', () => {
	const dbPath = join(tmpdir(), `test-session-${Math.random().toString(36).slice(2)}.db`);

	afterEach(() => {
		if (existsSync(dbPath)) {
			try {
				unlinkSync(dbPath);
			} catch {
				// Ignore errors during cleanup
			}
		}
	});

	it('should add items and persist them', async () => {
		const session = new DiskSession(dbPath);
		const sessionId = await session.getSessionId();
		await session.addItems([user('hello')]);

		const items = await session.getItems();
		expect(items).toHaveLength(1);
		expect(items[0]).toEqual(user('hello'));

		// Create a new session with the same DB to check persistence
		const session2 = new DiskSession(dbPath, { sessionId });
		const items2 = await session2.getItems();
		expect(items2).toHaveLength(1);
		expect(items2[0]).toEqual(user('hello'));
	});

	it('should handle popItem and persist it', async () => {
		const session = new DiskSession(dbPath);
		const sessionId = await session.getSessionId();
		await session.addItems([user('msg 1'), user('msg 2')]);

		const popped = await session.popItem();
		expect(popped).toEqual(user('msg 2'));

		const items = await session.getItems();
		expect(items).toHaveLength(1);
		expect(items[0]).toEqual(user('msg 1'));

		// Check persistence
		const session2 = new DiskSession(dbPath, { sessionId });
		const items2 = await session2.getItems();
		expect(items2).toHaveLength(1);
		expect(items2[0]).toEqual(user('msg 1'));
	});

	it('should clearSession and persist it', async () => {
		const session = new DiskSession(dbPath);
		const sessionId = await session.getSessionId();
		await session.addItems([user('msg 1')]);
		await session.clearSession();

		const items = await session.getItems();
		expect(items).toHaveLength(0);

		// Check persistence
		const session2 = new DiskSession(dbPath, { sessionId });
		const items2 = await session2.getItems();
		expect(items2).toHaveLength(0);
	});

	it('should persist initialItems', async () => {
		const sessionId = 'initial-test';
		const initialItems = [user('initial')];
		const session = new DiskSession(dbPath, { sessionId, initialItems });

		const items = await session.getItems();
		expect(items).toHaveLength(1);
		expect(items[0]).toEqual(user('initial'));

		// Check persistence
		const session2 = new DiskSession(dbPath, { sessionId });
		const items2 = await session2.getItems();
		expect(items2).toHaveLength(1);
		expect(items2[0]).toEqual(user('initial'));
	});

	it('should support multiple sessions in the same database', async () => {
		const session1 = new DiskSession(dbPath, { sessionId: 's1' });
		const session2 = new DiskSession(dbPath, { sessionId: 's2' });

		await session1.addItems([user('hello 1')]);
		await session2.addItems([user('hello 2')]);

		expect(await session1.getItems()).toHaveLength(1);
		expect(await session2.getItems()).toHaveLength(1);

		const session1Reloaded = new DiskSession(dbPath, { sessionId: 's1' });
		const session2Reloaded = new DiskSession(dbPath, { sessionId: 's2' });

		expect(await session1Reloaded.getItems()).toHaveLength(1);
		expect((await session1Reloaded.getItems())[0]).toEqual(user('hello 1'));
		expect(await session2Reloaded.getItems()).toHaveLength(1);
		expect((await session2Reloaded.getItems())[0]).toEqual(user('hello 2'));
	});
});

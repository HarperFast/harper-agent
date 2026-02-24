import { existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DiskSession } from './DiskSession';

const filePath = join(tmpdir(), `harper-agent-disk-session-plan-${Math.random().toString(36).slice(2)}.json`);

describe('DiskSession plan persistence', () => {
	afterEach(() => {
		if (existsSync(filePath)) {
			try {
				unlinkSync(filePath);
			} catch {}
		}
	});

	it('persists and restores plan state across instances', async () => {
		const session1 = new DiskSession(filePath);
		await session1.setPlanState({
			planDescription: 'My test plan',
			planItems: [
				{ id: 1, text: 'Do A', status: 'in-progress' },
				{ id: 2, text: 'Do B', status: 'todo' },
			],
			progress: 50,
		});

		const session2 = new DiskSession(filePath);
		const restored = await session2.getPlanState();
		expect(restored).toBeTruthy();
		expect(restored!.planDescription).toBe('My test plan');
		expect(restored!.planItems.length).toBe(2);
		expect(restored!.planItems[0]).toMatchObject({ id: 1, text: 'Do A', status: 'in-progress' });
		expect(restored!.progress).toBe(50);
	});
});

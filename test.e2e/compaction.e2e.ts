import 'dotenv/config';
import { type SystemMessageItem, type UserMessageItem } from '@openai/agents';
import { readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { parseArgs } from '../lifecycle/parseArgs';
import { createSession } from '../utils/sessions/createSession';

/**
 * Integration test: exercises the real compaction flow against a live model.
 * - Builds a larger conversation (>= 21 items: 1 system + 20 user messages with heavy content)
 * - Forces compaction via session.runCompaction({ force: true })
 * - Verifies the resulting items follow the expected pattern:
 * - Verifies compaction actually happened and didn't fail with "... conversation history compacted ..."
 *   [system(compaction notice), ...last3]
 */
describe('Memory compaction integration (real LLM)', () => {
	const originalCwd = process.cwd();
	let tempFile: string;

	beforeAll(() => parseArgs());

	beforeEach(async () => {
		tempFile = path.join(originalCwd, `.tmp-compaction-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
	});

	afterEach(async () => {
		try {
			await rm(tempFile, { recursive: true, force: true });
		} catch {}
	});

	test.each([{ file: 'sessionWithoutTimestamps.json' }, { file: 'sessionWithoutTimestamps.json' }])(
		'tests compaction on $file',
		async ({ file }) => {
			const exampleItems: Array<UserMessageItem | SystemMessageItem> = JSON.parse(readFileSync(
				`${__dirname}/samples/${file}`,
				'utf8',
			));

			const session = createSession(tempFile);

			await session.addItems(exampleItems);
			// Force compaction regardless of token threshold to exercise the model call
			await session.runCompaction({ force: true });

			const items = (await session.getItems()) as Array<UserMessageItem | SystemMessageItem>;

			// After compaction: first item + compaction notice + last 3 items => 5 total
			expect(items.length).toBe(4);
			expect(items[0]!.role).toBe('system');
			expect(items[1]).toEqual(exampleItems.at(-3));
			expect(items[2]).toEqual(exampleItems.at(-2));
			expect(items[3]).toEqual(exampleItems.at(-1));

			const noticeText = items![0]!.content;
			expect(String(noticeText)).toMatch(/Key observations from earlier:/i);
			expect(String(noticeText)).not.toEqual('... conversation history compacted ...');
		},
		90_000,
	);
});

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { harperResponse } from '../utils/shell/harperResponse';
import { sayHi } from './sayHi';
import { trackedState } from './trackedState';

vi.mock('../utils/shell/harperResponse', () => ({
	harperResponse: vi.fn(),
}));

describe('sayHi', () => {
	const testDir = join(process.cwd(), '.tmp-test-sayhi');

	beforeEach(() => {
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true, force: true });
		}
		mkdirSync(testDir);
		trackedState.cwd = testDir;
		vi.clearAllMocks();
	});

	afterEach(() => {
		rmSync(testDir, { recursive: true, force: true });
	});

	it('guides the user to create a harper app', () => {
		sayHi();

		expect(harperResponse).toHaveBeenCalledWith(
			expect.stringContaining('What kind of Harper app do you want to make together?'),
		);
	});

	it('guides the user differently if a harper app already exists', () => {
		writeFileSync(join(testDir, 'config.yaml'), 'neat');

		sayHi();

		expect(harperResponse).toHaveBeenCalledWith(
			expect.stringContaining('What do you want to do together today?'),
		);
	});
});

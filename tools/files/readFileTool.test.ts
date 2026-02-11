import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { trackedState } from '../../lifecycle/trackedState';
import { execute as readFile } from './readFileTool';

describe('readFileTool', () => {
	const originalCwd = process.cwd();
	const testDir = join(originalCwd, '.tmp-read-file-test');

	beforeEach(async () => {
		await mkdir(testDir, { recursive: true });
		trackedState.cwd = testDir;
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
		trackedState.cwd = originalCwd;
	});

	it('reads a text file as utf8', async () => {
		const filePath = join(testDir, 'test.txt');
		const content = 'Hello, world!';
		await writeFile(filePath, content, 'utf8');

		const result = await readFile({ fileName: 'test.txt' });
		expect(result).toBe(content);
	});

	it('returns an error for non-existent file', async () => {
		const result = await readFile({ fileName: 'non-existent.txt' });
		expect(result).toContain('Error reading file');
	});

	it('reads an image file and returns a structured image object', async () => {
		const filePath = join(testDir, 'test.png');
		const buffer = Buffer.from('fake-image-data');
		await writeFile(filePath, buffer);

		const result = await readFile({ fileName: 'test.png' });
		expect(typeof result).toBe('object');
		if (typeof result === 'object' && result !== null) {
			expect(result.type).toBe('image');
			expect(result.image).toContain('data:image/png;base64,');
			expect(result.image).toContain(buffer.toString('base64'));
			expect(result.detail).toBe('auto');
		}
	});
});

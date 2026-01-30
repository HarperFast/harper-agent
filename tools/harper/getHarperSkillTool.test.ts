import { describe, expect, it } from 'vitest';
import { execute, skillLinkRegex } from './getHarperSkillTool';

describe('getHarperSkillTool', () => {
	it('should return the content of a skill', async () => {
		// We know 'adding-tables' should exist if node_modules is present
		const result = await execute({ skill: 'adding-tables' });
		expect(result).toContain('# Adding Tables');
	});

	it('should return an error if skill not found', async () => {
		const result = await execute({ skill: 'non-existent-skill' });
		expect(result).toContain('Error reading Harper skill');
	});

	describe('skillLinkRegex', () => {
		it('should find [Adding Tables](skills/adding-tables.md) and turn it into adding-tables', () => {
			const input = '[Adding Tables](skills/adding-tables.md)';
			const result = input.replace(skillLinkRegex, '$1');
			expect(result).toBe('adding-tables');
		});

		it('should work with multiple links in a string', () => {
			const input =
				'- [Adding Tables](skills/adding-tables.md): Learn how...\n- [Automatic REST APIs](skills/automatic-rest-apis.md): Details...';
			const result = input.replace(skillLinkRegex, '$1');
			expect(result).toContain('- adding-tables: Learn how...');
			expect(result).toContain('- automatic-rest-apis: Details...');
		});

		it('should not match other types of links', () => {
			const input = '[Google](https://google.com) or [Other](other/file.md)';
			const result = input.replace(skillLinkRegex, '$1');
			expect(result).toBe(input);
		});
	});
});

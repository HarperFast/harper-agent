import { beforeEach, describe, expect, it } from 'vitest';
import { trackedState } from '../../lifecycle/trackedState';
import { execute as getHarperSkillExecute, skills as harperSkills } from '../harper/getHarperSkillTool';
import { execute as applyExecute, needsApproval as applyNeedsApproval } from './applyPatchTool';

// Minimal RunContext stub
const runContextStub = {
	isToolApproved: () => false,
};

describe('applyPatchTool guards', () => {
	beforeEach(() => {
		trackedState.cwd = process.cwd();
	});

	it('bypasses HITL and returns skill content when writing to resources/ without prior skill', async () => {
		// Ensure at least one of the required skills exists; otherwise skip this test
		const targetSkill = harperSkills.includes('automatic-apis')
			? 'automatic-apis'
			: (harperSkills.includes('adding-tables-with-schemas') ? 'adding-tables-with-schemas' : null);
		if (!targetSkill) {
			// Environment without the expected skills; the feature is a no-op
			return;
		}

		// Mock no skills read yet
		(trackedState as any).session = {
			async getSkillsRead() {
				return [];
			},
		};

		const operation = {
			type: 'create_file' as const,
			path: 'resources/some-file.txt',
			diff: '+hello\n',
		};

		const needs = await applyNeedsApproval(runContextStub, operation, 'call_1');
		expect(needs).toBe(false);

		const result = await applyExecute(operation);
		expect(result.status).toBe('skill_required');
		expect(typeof result.output === 'string').toBe(true);

		const expected = await getHarperSkillExecute({ skill: targetSkill });
		expect(result.output).toContain(expected);
	});
});

import { type RunContext, tool } from '@openai/agents';
import chalk from 'chalk';
import { z } from 'zod';
import { agentManager } from '../../agent/AgentManager';
import { trackedState } from '../../lifecycle/trackedState';
import { printDiff } from '../../utils/files/printDiff';
import { getEnv } from '../../utils/getEnv';
import { execute as getHarperSkillExecute, skills as harperSkills } from '../harper/getHarperSkillTool';
import { WorkspaceEditor } from './workspaceEditor';

const ApplyPatchParameters = z.object({
	type: z.enum(['create_file', 'update_file', 'delete_file']).describe('The type of operation to perform.'),
	path: z.string().describe('The path to the file to operate on.'),
	diff: z.string().optional().default('').describe(
		'The diff to apply. For create_file, every line must start with "+". For update_file, use a headerless unified diff format (start sections with "@@", and use "+", "-", or " " for lines). Do not include markers like "*** Begin Patch" or "*** Add File:".',
	),
});

function normalizedPath(p: string): string {
	return p.replace(/\\/g, '/').replace(/^\.\/?/, '');
}

async function getSkillsRead(): Promise<string[]> {
	try {
		const s = agentManager.session;
		const arr = await Promise.resolve(s?.getSkillsRead?.());
		return Array.isArray(arr) ? arr as string[] : [];
	} catch {
		return [];
	}
}

function pickExistingSkill(candidates: string[]): string | null {
	for (const c of candidates) { if (harperSkills.includes(c)) { return c; } }
	return null;
}

async function requiredSkillForOperation(
	path: string,
	type: 'create_file' | 'update_file' | 'delete_file',
): Promise<string | null> {
	if (type === 'delete_file') { return null; }
	const p = normalizedPath(path);
	const read = await getSkillsRead();
	// Guard 1: resources/
	if (
		p.includes('/resources/') || p.startsWith('resources/') || p.endsWith('resources.ts') || p.endsWith('resources.js')
	) {
		if (!read.includes('automatic-apis')) {
			return pickExistingSkill(['automatic-apis']);
		}
	}
	// Guard 2: schemas/ or schema/
	if (
		p.endsWith('.graphql')
	) {
		if (!read.includes('adding-tables-with-schemas')) {
			return pickExistingSkill(['adding-tables-with-schemas']);
		}
	}
	return null;
}

const editor = new WorkspaceEditor(() => trackedState.cwd);

export async function needsApproval(
	runContext: RunContext,
	operation: z.infer<typeof ApplyPatchParameters>,
	callId?: string,
) {
	try {
		// Guard check first: if a required skill is missing, bypass HITL silently
		const needed = await requiredSkillForOperation(operation.path, operation.type);
		if (needed) {
			return false;
		}
		if (callId && runContext.isToolApproved({ toolName: 'apply_patch', callId })) {
			return false;
		}

		const autoApproved = getEnv('HARPER_AGENT_AUTO_APPROVE_PATCHES', 'APPLY_PATCH_AUTO_APPROVE') === '1';

		// TODO:
		//   if (autoApproved) {
		//   	console.log(`\n${chalk.bold.bgGreen.black(' Apply patch (auto-approved): ')}`);
		//   } else {
		//   	console.log(`\n${chalk.bold.bgYellow.black(' Apply patch approval required: ')}`);
		//   }
		//   console.log(`${chalk.bold(operation.type)}: ${operation.path}`);
		//   if (operation.diff) {
		//   	printDiff(operation.diff);
		//   }

		return !autoApproved;
	} catch (err) {
		console.error('apply_patch approval step failed:', err);
		return false;
	}
}

export async function execute(operation: z.infer<typeof ApplyPatchParameters>) {
	try {
		// Guard check: if a required skill is missing, return that skill content instead of applying the patch
		const needed = await requiredSkillForOperation(operation.path, operation.type);
		if (needed) {
			const content = await getHarperSkillExecute({ skill: needed });
			// TODO: console.log(`Understanding ${needed} is necessary before applying this patch.`);
			return { status: 'failed, skill guarded', output: content } as const;
		}
		switch (operation.type) {
			case 'create_file':
				if (!operation.diff) {
					return { status: 'failed', output: 'Error: diff is required for create_file' } as const;
				}
				return await editor.createFile(operation as any);
			case 'update_file':
				if (!operation.diff) {
					return { status: 'failed', output: 'Error: diff is required for update_file' } as const;
				}
				return await editor.updateFile(operation as any);
			case 'delete_file':
				return await editor.deleteFile(operation as any);
			default:
				return { status: 'failed', output: `Error: Unknown operation type: ${(operation as any).type}` } as const;
		}
	} catch (err) {
		console.error('hit unexpected error in apply patch tool', err);
		// Ensure the tool always returns something the LLM can react to
		return { status: 'failed', output: `apply_patch threw: ${String(err)}` } as const;
	}
}

export function createApplyPatchTool() {
	return tool({
		name: 'apply_patch',
		description: 'Applies a patch (create, update, or delete a file) to the workspace.',
		parameters: ApplyPatchParameters,
		needsApproval,
		execute,
	});
}

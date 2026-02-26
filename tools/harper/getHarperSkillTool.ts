import { tool } from '@openai/agents';
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import { agentManager } from '../../agent/AgentManager';

const require = createRequire(import.meta.url);

const harperSkillsModuleDir = dirname(
	require.resolve('@harperfast/skills/package.json'),
);

const harperBestPracticesDir = join(
	harperSkillsModuleDir,
	'harper-best-practices',
);
const skillRootFile = join(
	harperBestPracticesDir,
	'SKILL.md',
);
const rulesDir = join(
	harperBestPracticesDir,
	'rules',
);

export const skillLinkRegex = /\[[^\]]+]\((?:rules|skills)\/([^)]+)\.md\)/g;
export const skills = getSkills();

const ToolParameters = z.object({
	skill: z.enum(skills.length > 0 ? (skills as [string, ...string[]]) : ['none']).describe(
		'The name of the skill to retrieve.',
	),
});

export const getHarperSkillTool = tool({
	name: 'get_harper_skill',
	description: getSkillsDescription(),
	parameters: ToolParameters,
	execute,
});

function getSkillsDescription() {
	try {
		return readFileSync(skillRootFile, 'utf8')
			.replace('This repository contains', 'This tool describes')
			.replace(skillLinkRegex, '$1');
	} catch {
		return 'Returns the contents of a Harper skill markdown file. Skills provide guidance on developing Harper applications.';
	}
}

function getSkills() {
	try {
		return readdirSync(rulesDir)
			.filter((file) => file.endsWith('.md'))
			.map((file) => file.replace('.md', ''));
	} catch {
		return [];
	}
}

export async function execute({ skill }: z.infer<typeof ToolParameters>) {
	if (skill === 'none') {
		return 'No skill requested.';
	}
	try {
		const filePath = join(rulesDir, `${skill}.md`);
		const content = readFileSync(filePath, 'utf8');
		agentManager.session?.addSkillRead?.(skill);
		return content;
	} catch (error) {
		return `Error reading Harper skill "${skill}": ${error}`;
	}
}

import { tool } from '@openai/agents';
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { z } from 'zod';

const createHarper = dirname(createRequire(import.meta.url).resolve('create-harper'));

const agentsMarkdown = join(
	createHarper,
	'AGENTS.md',
);
const skillsDir = join(
	createHarper,
	'template-vanilla',
	'skills',
);

export const skillLinkRegex = /\[[^\]]+]\(skills\/([^)]+)\.md\)/g;

const skills = getSkills();

const ToolParameters = z.object({
	skill: z.enum(skills.length > 0 ? (skills as [string, ...string[]]) : ['none']).describe(
		'The name of the skill to retrieve.',
	),
});

export const getHarperSkillTool = tool({
	name: 'getHarperSkill',
	description: getSkillsDescription(),
	parameters: ToolParameters,
	execute,
});

function getSkillsDescription() {
	try {
		return readFileSync(agentsMarkdown, 'utf-8')
			.replace('This repository contains', 'This tool describes')
			.replace(skillLinkRegex, '$1');
	} catch {
		return 'Returns the contents of a Harper skill markdown file. Skills provide guidance on developing Harper applications.';
	}
}

function getSkills() {
	try {
		return readdirSync(skillsDir)
			.filter((file) => file.endsWith('.md'))
			.map((file) => file.replace('.md', ''));
	} catch {
		return [];
	}
}

export async function execute({ skill }: z.infer<typeof ToolParameters>) {
	if (skill === 'none') {
		return 'No skills found.';
	}
	try {
		const filePath = join(skillsDir, `${skill}.md`);
		return readFileSync(filePath, 'utf-8');
	} catch (error) {
		return `Error reading Harper skill "${skill}": ${error}`;
	}
}

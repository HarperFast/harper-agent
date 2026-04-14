import { ruleNames, rules, skillSummary } from '@harperfast/skills';
import { tool } from '@openai/agents';
import { readdirSync, readFileSync } from 'node:fs';
import { z } from 'zod';
import { agentManager } from '../../agent/AgentManager';

export const skillLinkRegex = /\[[^\]]+]\((?:rules|skills)\/([^)]+)\.md\)/g;
export const skills = ruleNames;

const ToolParameters = z.object({
	skill: z.enum(ruleNames).describe(
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
		return skillSummary
			.replace('This repository contains', 'This tool describes')
			.replace(skillLinkRegex, '$1');
	} catch {
		return 'Returns the contents of a Harper skill markdown file. Skills provide guidance on developing Harper applications.';
	}
}

export async function execute({ skill }: z.infer<typeof ToolParameters>) {
	try {
		const content = rules[skill];
		if (!content) {
			return `No skill found with the name ${skill}`;
		}
		agentManager.session?.addSkillRead?.(skill);
		return content;
	} catch (error) {
		return `Error reading Harper skill "${skill}": ${error}`;
	}
}

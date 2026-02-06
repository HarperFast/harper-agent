import { tool } from '@openai/agents';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { z } from 'zod';

const ToolParameters = z.object({
	resourceFile: z.enum([
		'ResourceInterfaceV2',
		'ResourceInterface',
		'Table',
		'Resource',
		'ResourceV2',
	]).describe(
		'The resource-related definition file to read. Defaults to ResourceInterfaceV2.',
	).default('ResourceInterfaceV2'),
});

export const getHarperResourceInterfaceTool = tool({
	name: 'getHarperResourceInterfaceTool',
	description:
		'Reads HarperDB resource interface and class definitions (like ResourceInterfaceV2.d.ts) to understand how resources and tables are structured.',
	parameters: ToolParameters,
	async execute({ resourceFile }: z.infer<typeof ToolParameters>) {
		try {
			return await readFile(
				join(
					dirname(createRequire(import.meta.url).resolve('harperdb')),
					'resources',
					`${resourceFile}.d.ts`,
				),
				'utf8',
			);
		} catch (error) {
			return `Error reading HarperDB resource file ${resourceFile}: ${error}`;
		}
	},
});

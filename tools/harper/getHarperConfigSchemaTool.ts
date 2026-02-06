import { tool } from '@openai/agents';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { z } from 'zod';

const ToolParameters = z.object({
	schemaType: z.enum(['app', 'root']).describe(
		'The type of configuration schema to retrieve: "app" for application configuration or "root" for root Harper configuration.',
	),
});

export const getHarperConfigSchemaTool = tool({
	name: 'getHarperConfigSchemaTool',
	description:
		'Returns the JSON schema for HarperDB configuration files (either app or root), which describes the config.yaml or harperdb-config.yaml files.',
	parameters: ToolParameters,
	async execute({ schemaType }: z.infer<typeof ToolParameters>) {
		try {
			return await readFile(
				join(
					dirname(createRequire(import.meta.url).resolve('harperdb')),
					`config-${schemaType}.schema.json`,
				),
				'utf8',
			);
		} catch (error) {
			return `Error reading HarperDB ${schemaType} configuration schema: ${error}`;
		}
	},
});

import { tool } from '@openai/agents';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { z } from 'zod';

const ToolParameters = z.object({});

export const getHarperSchemaGraphQLTool = tool({
	name: 'getHarperSchemaGraphQLTool',
	description:
		'Returns the GraphQL schema for HarperDB schema files, which define the structure of HarperDB database tables.',
	parameters: ToolParameters,
	async execute() {
		try {
			return await readFile(
				join(
					dirname(createRequire(import.meta.url).resolve('harperdb')),
					`schema.graphql`,
				),
				'utf8',
			);
		} catch (error) {
			return `Error reading HarperDB GraphQL schema: ${error}`;
		}
	},
});

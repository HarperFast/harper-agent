import { tool } from '@openai/agents';
import { z } from 'zod';
import { trackedState } from '../../lifecycle/trackedState';
import { getHarperSchemaContent } from '../../utils/files/getHarperSchema';

const ToolParameters = z.object({});

export const getHarperSchemaGraphQLTool = tool({
	name: 'get_harper_schema_graphql',
	description:
		'Returns the GraphQL schema for HarperDB schema files, which define the structure of HarperDB database tables.',
	parameters: ToolParameters,
	async execute() {
		try {
			return getHarperSchemaContent(trackedState.cwd);
		} catch (error) {
			return `Error reading HarperDB GraphQL schema: ${error}`;
		}
	},
});

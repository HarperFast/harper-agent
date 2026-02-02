import { tool } from '@openai/agents';
import { z } from 'zod';
import { harperProcess } from '../../utils/shell/harperProcess';

const ToolParameters = z.object({
	method: z.enum(['POST', 'GET', 'PUT', 'DELETE']).optional().default('GET').describe(
		'The HTTP method to use, defaults to "get". Notably, POST and PUT require the full body be sent.',
	),
	path: z.string().optional().default('/openapi').describe('The path to fetch from localhost (defaults to /openapi).'),
	port: z.number().optional().default(harperProcess.httpPort).describe(
		'The port to fetch from localhost (defaults to the running Harper port).',
	),
	body: z.string().optional().default('').describe('An optional JSON string body to send along with the request.'),
});

export const hitHarperAPITool = tool({
	name: 'hitHarperAPITool',
	description: 'Performs a request against the running Harper API. Use /openapi to look up Harper APIs.',
	parameters: ToolParameters,
	needsApproval: async (runContext, input, callId) => {
		if (callId && runContext.isToolApproved({ toolName: 'hitHarperAPITool', callId })) {
			return false;
		}

		if (input.method === 'DELETE') {
			const segments = (input.path || '').split('/').filter(Boolean);
			if (segments.length <= 1) {
				return true;
			}
		}
		return false;
	},
	async execute({ path = '/openapi', port, method = 'GET', body }: z.infer<typeof ToolParameters>) {
		try {
			const effectivePort = port ?? (harperProcess.running ? harperProcess.httpPort : undefined);
			if (!effectivePort) {
				return `Error: No Harper application is currently running and no port was specified.`;
			}
			const response = await fetch(
				`http://localhost:${effectivePort}${path.startsWith('/') ? '' : '/'}${path}`,
				{
					method,
					headers: body
						? { 'Content-Type': 'application/json' }
						: {},
					body: body || null,
				},
			);

			if (!response.ok) {
				return `Error: Received non-ok response from fetch: ${response.statusText} (${response.status})`;
			}
			return await response.text();
		} catch (error) {
			return `Error: fetch failed: ${error}`;
		}
	},
});

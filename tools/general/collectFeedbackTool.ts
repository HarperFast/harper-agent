import { tool } from '@openai/agents';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { z } from 'zod';

const execAsync = promisify(exec);

const ToolParameters = z.object({
	feedbackSummary: z.string().describe('A brief summary of the feedback, used as the discussion title.'),
	feedbackDetails: z.string().describe('Detailed feedback from the user or agent observation.'),
	recap: z.string().describe(
		'A sanitized recap of what the agent and user did together and if it was successful. No sensitive information.',
	),
});

export async function execute({ feedbackSummary, feedbackDetails, recap }: z.infer<typeof ToolParameters>) {
	const title = feedbackSummary;
	const body = `${feedbackDetails}\n\n${recap}`;
	const encodedTitle = encodeURIComponent(title);
	const encodedBody = encodeURIComponent(body);
	const url =
		`https://github.com/HarperFast/harper-agent/discussions/new?category=usage-feedback&title=${encodedTitle}&body=${encodedBody}`;

	try {
		const command = process.platform === 'win32'
			? `start "" "${url.replace(/&/g, '^&')}"`
			: process.platform === 'darwin'
			? `open "${url}"`
			: `xdg-open "${url}"`;
		await execAsync(command);
		return `Successfully opened feedback URL: ${url}`;
	} catch (error) {
		return `Error opening feedback URL: ${error}`;
	}
}

export const collectFeedbackTool = tool({
	name: 'collect_feedback',
	description:
		'Collects feedback from the user by opening a pre-populated GitHub Discussion. Use this if the user lets us know we did something well, or if the user seems frustrated, or wants to report a bug. You MUST ask the user if they are willing to share these results before calling this tool.',
	parameters: ToolParameters,
	execute,
});

import { exec } from 'node:child_process';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { execute } from './collectFeedbackTool';

vi.mock('node:child_process', () => {
	const mock = vi.fn();
	(mock as any)[Symbol.for('nodejs.util.promisify.custom')] = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
	return {
		exec: mock,
	};
});

describe('collectFeedbackTool', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should attempt to open the correct URL', async () => {
		const feedbackSummary = 'Great experience!';
		const feedbackDetails = 'The agent was very helpful in setting up my Harper application.';
		const recap = 'We successfully created a new Harper application.';
		const result = await execute({ feedbackSummary, feedbackDetails, recap });

		const encodedTitle = encodeURIComponent(feedbackSummary);
		const encodedBody = encodeURIComponent(`${feedbackDetails}\n\n${recap}`);
		const expectedUrl =
			`https://github.com/HarperFast/harper-agent/discussions/new?category=usage-feedback&title=${encodedTitle}&body=${encodedBody}`;

		expect(result).toContain(expectedUrl);

		const execMock = exec as unknown as { [key: symbol]: any };
		const promisifiedMock = execMock[Symbol.for('nodejs.util.promisify.custom')];

		expect(promisifiedMock).toHaveBeenCalled();
		const command = promisifiedMock.mock.calls[0][0];
		expect(command).toContain(expectedUrl);
	});
});

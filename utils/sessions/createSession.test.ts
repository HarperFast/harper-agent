import { MemorySession, OpenAIResponsesCompactionSession } from '@openai/agents';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as getModelModule from '../../lifecycle/getModel';
import * as trackCompactionModule from '../../lifecycle/trackCompaction';
import { createSession } from './createSession';
import { MemoryCompactionSession } from './MemoryCompactionSession';

vi.mock('@openai/agents', () => ({
	MemorySession: vi.fn(),
	OpenAIResponsesCompactionSession: vi.fn(),
}));

vi.mock('./MemoryCompactionSession', () => ({
	MemoryCompactionSession: vi.fn(),
}));

vi.mock('../../lifecycle/getModel', () => ({
	getModel: vi.fn(),
	isOpenAIModel: vi.fn(),
}));

vi.mock('../../lifecycle/trackCompaction', () => ({
	trackCompaction: vi.fn(),
}));

describe('createSession', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should create a MemoryCompactionSession if compaction model is not an OpenAI model', () => {
		vi.mocked(getModelModule.isOpenAIModel).mockReturnValue(false);

		createSession('claude-3');

		expect(MemorySession).toHaveBeenCalled();
		expect(MemoryCompactionSession).toHaveBeenCalledWith(expect.objectContaining({
			underlyingSession: expect.any(MemorySession),
		}));
		expect(OpenAIResponsesCompactionSession).not.toHaveBeenCalled();
		expect(trackCompactionModule.trackCompaction).toHaveBeenCalled();
	});

	it('should create an OpenAIResponsesCompactionSession if compaction model is an OpenAI model', () => {
		vi.mocked(getModelModule.isOpenAIModel).mockReturnValue(true);
		vi.mocked(getModelModule.getModel).mockReturnValue('gpt-4o-mini' as any);

		createSession('gpt-4o-mini');

		expect(MemorySession).toHaveBeenCalled();
		expect(OpenAIResponsesCompactionSession).toHaveBeenCalledWith(expect.objectContaining({
			underlyingSession: expect.any(MemorySession),
			model: 'gpt-4o-mini',
		}));
		expect(trackCompactionModule.trackCompaction).toHaveBeenCalled();
	});
});

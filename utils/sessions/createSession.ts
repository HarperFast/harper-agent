import { MemorySession, OpenAIResponsesCompactionSession, type Session } from '@openai/agents';
import { getModel, isOpenAIModel } from '../../lifecycle/getModel';
import { trackCompaction } from '../../lifecycle/trackCompaction';
import { DiskSession } from './DiskSession';
import { MemoryCompactionSession } from './MemoryCompactionSession';

export function createSession(compactionModel: string | null, sessionPath: string | null = null): Session {
	const underlyingSession = sessionPath ? new DiskSession(sessionPath) : new MemorySession();
	const model = getModel(compactionModel, 'gpt-4o-mini') as any;
	const session = isOpenAIModel(compactionModel || 'gpt-4o-mini')
		? new OpenAIResponsesCompactionSession({ underlyingSession, model })
		: new MemoryCompactionSession({ underlyingSession, model });
	trackCompaction(session);
	return session;
}

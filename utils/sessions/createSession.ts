import { MemorySession, type Session } from '@openai/agents';
import { getModel, getModelName } from '../../lifecycle/getModel';
import { trackCompaction } from '../../lifecycle/trackCompaction';
import { DiskSession } from './DiskSession';
import { MemoryCompactionSession } from './MemoryCompactionSession';

export function createSession(compactionModel: string, sessionPath: string | null = null): Session {
	const underlyingSession = sessionPath ? new DiskSession(sessionPath) : new MemorySession();
	// Always use our own memory compaction session, regardless of provider
	const session = new MemoryCompactionSession({
		underlyingSession,
		model: getModel(compactionModel),
		modelName: getModelName(compactionModel),
	});
	trackCompaction(session);
	return session;
}

import { MemorySession } from '@openai/agents';
import type { CombinedSession } from '../../lifecycle/session';
import { trackCompaction } from '../../lifecycle/trackCompaction';
import { DiskSession } from './DiskSession';
import { MemoryCompactionSession } from './MemoryCompactionSession';

export function createSession(sessionPath: string | null = null): CombinedSession {
	const underlyingSession = sessionPath ? new DiskSession(sessionPath) : new MemorySession();
	// Always use our own memory compaction session, regardless of provider
	const session = new MemoryCompactionSession({
		underlyingSession,
	});
	trackCompaction(session);
	return session;
}

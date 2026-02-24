import type { Session } from '@openai/agents';
import type { WithPlanState } from './withPlanState';
import type { WithRunCompaction } from './withRunCompaction';
import type { WithSkillsRead } from './withSkillsRead';

export interface WithLatestAddedTimestamp {
	getLatestAddedTimestamp(): Promise<number | null>;
}

export type CombinedSession = Session & WithRunCompaction & WithSkillsRead & WithPlanState & WithLatestAddedTimestamp;

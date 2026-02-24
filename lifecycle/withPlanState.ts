export type PlanItemStatus = 'todo' | 'in-progress' | 'done' | 'not-needed';

export interface PlanItemPersisted {
	id: number;
	text: string;
	status: PlanItemStatus;
}

export interface PlanState {
	planDescription: string;
	planItems: PlanItemPersisted[];
	progress?: number;
}

export interface WithPlanState {
	/**
	 * Returns the persisted plan state for the current session, or null if none exists.
	 */
	getPlanState(): Promise<PlanState | null>;
	/**
	 * Merges and persists a partial plan state for the current session.
	 */
	setPlanState(state: Partial<PlanState>): Promise<void> | void;
}

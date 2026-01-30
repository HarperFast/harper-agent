export interface TrackedState {
	atStartOfLine: boolean;
	emptyLines: number;
	approvalState: any | null;
	controller: AbortController | null;
	model: string | null;
	compactionModel: string | null;
}

export const trackedState: TrackedState = {
	atStartOfLine: true,
	emptyLines: 0,
	approvalState: null,
	controller: null,
	model: null,
	compactionModel: null,
};

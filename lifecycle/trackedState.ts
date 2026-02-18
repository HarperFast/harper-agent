export interface TrackedState {
	cwd: string;
	model: string;
	compactionModel: string;
	sessionPath: string | null;
	useFlexTier: boolean;
	maxTurns: number;
	maxCost: number | null;
}

export const trackedState: TrackedState = {
	cwd: process.cwd(),
	model: '',
	compactionModel: '',
	sessionPath: null,
	useFlexTier: false,
	maxTurns: 30,
	maxCost: null,
};

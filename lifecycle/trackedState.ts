import { resolveSessionPathConsideringHarper } from '../utils/files/harperApp';

export interface TrackedState {
	originalCwd: string;
	cwd: string;
	model: string;
	compactionModel: string;
	originalSessionPath: string | null;
	sessionPath: string | null;
	useFlexTier: boolean;
	currentTurn: number;
	maxTurns: number;
	maxCost: number | null;
	autoApproveCodeInterpreter: boolean;
	autoApprovePatches: boolean;
	autoApproveShell: boolean;
	monitorRateLimits: boolean;
	rateLimitThreshold: number;
	autonomous: boolean;
	prompt: string | null;
}
export const trackedState: TrackedState = {
	originalCwd: process.cwd(),
	cwd: process.cwd(),
	model: '',
	compactionModel: '',
	originalSessionPath: null,

	get sessionPath() {
		return resolveSessionPathConsideringHarper(trackedState.originalSessionPath, this.cwd, this.originalCwd);
	},
	set sessionPath(value: string | null) {
		trackedState.originalSessionPath = value;
	},

	useFlexTier: false,
	currentTurn: 0,
	maxTurns: 30,
	maxCost: null,
	autoApproveCodeInterpreter: false,
	autoApprovePatches: false,
	autoApproveShell: false,
	monitorRateLimits: true,
	rateLimitThreshold: 80,
	autonomous: false,
	prompt: null,
};

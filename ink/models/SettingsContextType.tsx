export interface SettingsContextType {
	version?: number;
	model: string;
	compactionModel: string;
	sessionPath: string | null;
	cwd: string;
	useFlexTier: boolean;
	maxTurns: number;
	maxCost: number | null;
	autoApproveCodeInterpreter: boolean;
	autoApprovePatches: boolean;
	autoApproveShell: boolean;
}

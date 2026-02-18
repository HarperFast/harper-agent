export interface SettingsContextType {
	model: string;
	compactionModel: string;
	sessionPath: string | null;
	cwd: string;
	useFlexTier: boolean;
	maxTurns: number;
	maxCost: number | null;
}

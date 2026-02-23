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
	monitorRateLimits: boolean;
	rateLimitThreshold: number;
	rateLimitStatus?: {
		limitRequests: number | null;
		limitTokens: number | null;
		remainingRequests: number | null;
		remainingTokens: number | null;
		resetRequests: string | null;
		resetTokens: string | null;
	};
}

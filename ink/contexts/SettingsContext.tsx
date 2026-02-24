import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';
import { trackedState } from '../../lifecycle/trackedState';
import { rateLimitTracker } from '../../utils/sessions/rateLimits';
import { useListener } from '../emitters/listener';
import type { SettingsContextType } from '../models/SettingsContextType';

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
	const context = useContext(SettingsContext);
	if (!context) {
		throw new Error('useSettings must be used within a SettingsProvider');
	}
	return context;
};

export const SettingsProvider = ({
	children,
}: {
	children: ReactNode;
}) => {
	const [version, setVersion] = useState(0);

	useListener('SettingsUpdated', () => {
		setVersion((v) => v + 1);
	}, []);

	const value = useMemo(() => ({
		version,
		model: trackedState.model,
		compactionModel: trackedState.compactionModel,
		sessionPath: trackedState.sessionPath,
		cwd: trackedState.cwd,
		useFlexTier: trackedState.useFlexTier,
		currentTurn: trackedState.currentTurn,
		maxTurns: trackedState.maxTurns,
		maxCost: trackedState.maxCost,
		autoApproveCodeInterpreter: trackedState.autoApproveCodeInterpreter,
		autoApprovePatches: trackedState.autoApprovePatches,
		autoApproveShell: trackedState.autoApproveShell,
		monitorRateLimits: trackedState.monitorRateLimits,
		rateLimitThreshold: trackedState.rateLimitThreshold,
		rateLimitStatus: rateLimitTracker.getStatus(),
	} satisfies SettingsContextType), [version]);

	return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

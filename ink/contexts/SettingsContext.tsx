import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { trackedState } from '../../lifecycle/trackedState';
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
	const value = useMemo(() => ({
		model: trackedState.model,
		compactionModel: trackedState.compactionModel,
		sessionPath: trackedState.sessionPath,
		cwd: trackedState.cwd,
		useFlexTier: trackedState.useFlexTier,
		maxTurns: trackedState.maxTurns,
		maxCost: trackedState.maxCost,
	} satisfies SettingsContextType), []);

	return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

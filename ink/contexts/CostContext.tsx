import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';
import { useListener } from '../emitters/listener';

export interface CostData {
	totalCost: number;
	inputTokens: number;
	outputTokens: number;
	cachedInputTokens: number;
	hasUnknownPrices: boolean;
}

export interface CostContextType {
	cost: CostData;
}

const CostContext = createContext<CostContextType | undefined>(undefined);

export const useCost = () => {
	const context = useContext(CostContext);
	if (!context) {
		throw new Error('useCost must be used within a CostProvider');
	}
	return context;
};

export const CostProvider = ({
	children,
}: {
	children: ReactNode;
}) => {
	const [cost, setCost] = useState<CostData>({
		totalCost: 0,
		inputTokens: 0,
		outputTokens: 0,
		cachedInputTokens: 0,
		hasUnknownPrices: false,
	});

	useListener('UpdateCost', (newCost) => {
		setCost(newCost);
	}, []);

	const value = useMemo(() => ({
		cost,
	}), [cost]);

	return <CostContext.Provider value={value}>{children}</CostContext.Provider>;
};

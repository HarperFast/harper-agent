import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';
import { lastEmittedValue, useListener } from '../emitters/listener';
import type { PlanContextType } from '../models/planContextType';
import type { PlanItem } from '../models/planItem';

const PlanContext = createContext<PlanContextType>({ planDescription: '', planItems: [], progress: 0 });

export const usePlan = () => {
	const context = useContext(PlanContext);
	if (!context) {
		throw new Error('usePlan must be used within a PlanProvider');
	}
	return context;
};

export const PlanProvider = ({
	children,
}: {
	children: ReactNode;
}) => {
	const initialPlanDescription = lastEmittedValue('SetPlanDescription') || '';
	const initialPlanItems = lastEmittedValue('SetPlanItems') || [];
	const initialProgress = calculatePlanProgress(initialPlanItems);

	const [planDescription, setPlanDescription] = useState<string>(initialPlanDescription);
	const [planItems, setPlanItems] = useState<PlanItem[]>(initialPlanItems);
	const [progress, setProgress] = useState<number>(initialProgress);

	useListener('SetPlanDescription', newGoal => {
		setPlanDescription(newGoal);
	}, []);

	useListener('SetPlanItems', (planItems) => {
		const progress = calculatePlanProgress(planItems);
		setPlanItems(planItems);
		setProgress(progress);
	}, []);

	const value = useMemo(() => ({
		progress,
		planDescription,
		planItems,
	}), [progress, planDescription, planItems]);

	return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
};

export function calculatePlanProgress(planItems: null | PlanItem[]) {
	if (!planItems?.length) {
		return 0;
	}
	const completedCount = planItems.filter(item => item.status === 'done' || item.status === 'not-needed').length;
	return Math.round((completedCount / planItems.length) * 100);
}

import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';
import { useListener } from '../emitters/listener';
import type { PlanContextType } from '../models/planContextType';
import type { PlanItem } from '../models/planItem';
import { globalPlanContext } from './globalPlanContext';

const PlanContext = createContext<PlanContextType>(globalPlanContext);

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
	const [planDescription, setPlanDescription] = useState<string>(globalPlanContext.planDescription);
	const [planItems, setPlanItems] = useState<PlanItem[]>(globalPlanContext.planItems);
	const [progress, setProgress] = useState<number>(globalPlanContext.progress);

	useListener('SetPlanDescription', newGoal => {
		globalPlanContext.planDescription = newGoal;
		setPlanDescription(newGoal);
	}, []);

	useListener('SetPlanItems', (planItems) => {
		globalPlanContext.planItems = planItems;
		const completedCount = planItems.filter(item => item.completed).length;
		const progress = planItems.length === 0 ? 0 : Math.round((completedCount / planItems.length) * 100);
		globalPlanContext.progress = progress;
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

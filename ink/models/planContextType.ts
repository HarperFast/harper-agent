import type { PlanItem } from './planItem';

export interface PlanContextType {
	goal: string;
	planItems: PlanItem[];
	progress: number;
}

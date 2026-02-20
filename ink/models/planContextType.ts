import type { PlanItem } from './planItem';

export interface PlanContextType {
	planDescription: string;
	planItems: PlanItem[];
	progress: number;
}

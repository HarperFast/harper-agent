import { tool } from '@openai/agents';
import { z } from 'zod';
import { emitToListeners } from '../../ink/emitters/listener';
import type { CombinedSession } from '../../lifecycle/session';

const AddPlanItemParameters = z.object({
	text: z.string().describe('The description of the task or milestone to add to the plan.'),
});

export function createAddPlanItemTool(session: CombinedSession) {
	return tool({
		name: 'add_plan_item',
		description: 'Add a new item to the plan.',
		parameters: AddPlanItemParameters,
		async execute({ text }: z.infer<typeof AddPlanItemParameters>) {
			const planContext = await session.getPlanState();
			const existingPlanItems = planContext.planItems;
			const newItems = [
				...existingPlanItems,
				{
					id: existingPlanItems.length + 1,
					text,
					status: 'todo' as const,
				},
			];
			planContext.planItems = newItems;
			session.setPlanState(planContext);
			emitToListeners('SetPlanItems', newItems);
			return `Added plan item: ${text}`;
		},
	});
}

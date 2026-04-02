import { tool } from '@openai/agents';
import { z } from 'zod';
import { emitToListeners } from '../../ink/emitters/listener';
import type { CombinedSession } from '../../lifecycle/session';

const UpdatePlanItemParameters = z.object({
	id: z.number().describe('The ID of the plan item to update.'),
	text: z.string().describe('The new description of the task.'),
	status: z.enum(['unchanged', 'todo', 'in-progress', 'done', 'not-needed']).describe(
		'The new status of the task.',
	),
});

export function createUpdatePlanItemTool(session: CombinedSession) {
	return tool({
		name: 'update_plan_item',
		description: 'Update an existing plan item.',
		parameters: UpdatePlanItemParameters,
		async execute({ id, text, status }: z.infer<typeof UpdatePlanItemParameters>) {
			const planContext = await session.getPlanState();
			const planItems = planContext?.planItems ?? [];

			const itemExists = planItems.some(item => item.id === id);
			if (!itemExists) {
				return `Error: Plan item with ID ${id} not found.`;
			}

			const newItems = planItems.map(item => {
				if (item.id === id) {
					return {
						...item,
						text: text || item.text,
						status: status && status !== 'unchanged' ? status : item.status,
					};
				}
				return item;
			});
			planContext.planItems = newItems;
			session.setPlanState(planContext);
			emitToListeners('SetPlanItems', newItems);
			return `Updated plan item ${id}`;
		},
	});
}

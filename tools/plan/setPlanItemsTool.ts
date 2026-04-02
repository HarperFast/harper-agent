import { tool } from '@openai/agents';
import { z } from 'zod';
import { emitToListeners } from '../../ink/emitters/listener';
import type { CombinedSession } from '../../lifecycle/session';

const SetPlanItemsParameters = z.object({
	items: z.array(z.string()).describe('An array of task descriptions to set as the plan items.'),
});

export function createSetPlanItemsTool(session: CombinedSession) {
	return tool({
		name: 'set_plan_items',
		description: 'Set multiple plan items at once, replacing any existing items.',
		parameters: SetPlanItemsParameters,
		async execute({ items }: z.infer<typeof SetPlanItemsParameters>) {
			const planContext = await session.getPlanState();
			const newItems = items.map((text, index) => ({
				id: index + 1,
				text,
				status: 'todo' as const,
			}));
			planContext.planItems = newItems;
			session.setPlanState(planContext);
			emitToListeners('SetPlanItems', newItems);
			return `Set ${newItems.length} plan items.`;
		},
	});
}

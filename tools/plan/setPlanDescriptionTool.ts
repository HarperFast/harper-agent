import { tool } from '@openai/agents';
import { z } from 'zod';
import { emitToListeners } from '../../ink/emitters/listener';
import type { CombinedSession } from '../../lifecycle/session';

const SetPlanDescriptionParameters = z.object({
	description: z.string().describe('A high-level description of the overall plan and goals.'),
});

export function createSetPlanDescriptionTool(session: CombinedSession) {
	return tool({
		name: 'set_plan_description',
		description: 'Set the high-level description for the current plan.',
		parameters: SetPlanDescriptionParameters,
		async execute({ description }: z.infer<typeof SetPlanDescriptionParameters>) {
			const planContext = await session.getPlanState();
			planContext.planDescription = description;
			session.setPlanState(planContext);
			emitToListeners('SetPlanDescription', description);
			return `Plan description updated to: ${description}`;
		},
	});
}

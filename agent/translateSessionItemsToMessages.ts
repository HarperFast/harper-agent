import type { AgentInputItem } from '@openai/agents';
import type { Message } from '../ink/models/message';

export function translateSessionItemsToMessages(items: AgentInputItem[]) {
	const messages: Message[] = [];

	if (items.length > 0) {
		let id = 0;

		for (const item of items) {
			if (item.type === 'message' && item.role === 'user') {
				messages.push({
					id: id++,
					type: 'user',
					text: item.content as string,
					version: 1,
				});
			} else if (item.type === 'message' && item.role === 'assistant') {
				if (typeof item.content === 'string') {
					messages.push({
						id: id++,
						type: 'agent',
						text: item.content,
						version: 1,
					});
				} else if (Array.isArray(item.content)) {
					for (const part of item.content as any[]) {
						if (part.type === 'text' || part.type === 'output_text') {
							messages.push({
								id: id++,
								type: 'agent',
								text: part.text,
								version: 1,
							});
						} else if (part.type === 'tool_call' || part.type === 'function_call') {
							const args = typeof part.arguments === 'string'
								? part.arguments
								: part.arguments
								? JSON.stringify(part.arguments)
								: '';
							const displayedArgs = args
								? `(${args})`
								: '()';
							messages.push({
								id: id++,
								type: 'tool',
								text: part.name,
								args: displayedArgs,
								version: 1,
							});
						}
					}
				}
			} else if (item.type === 'function_call') {
				const args = typeof item.arguments === 'string'
					? item.arguments
					: item.arguments
					? JSON.stringify(item.arguments)
					: '';
				const displayedArgs = args
					? `(${args})`
					: '()';
				messages.push({
					id: id++,
					type: 'tool',
					text: item.name,
					args: displayedArgs,
					version: 1,
				});
			}
		}
	}

	return messages;
}

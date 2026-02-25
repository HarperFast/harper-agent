/**
 * Rough token estimator: ~4 chars per token heuristic across text content
 */
export function estimateTokens<
	T extends { type?: string | undefined; content?: any; text?: any; result?: any; call?: any },
>(items: T[]): number {
	let chars = 0;
	for (const it of items) {
		if (!it) { continue; }
		// message-style with content
		if (Array.isArray(it.content)) {
			for (const c of it.content) {
				if (!c) { continue; }
				if (typeof c.text === 'string') { chars += c.text.length; }
				else if (typeof c.content === 'string') { chars += c.content.length; }
				else if (typeof c === 'string') { chars += c.length; }
			}
		}
		// single string content
		if (typeof it.content === 'string') {
			chars += it.content.length;
		}
		if (typeof it.text === 'string') {
			chars += it.text.length;
		}
		// function calls and results
		if (it.type === 'function_call' && it.call) {
			chars += JSON.stringify(it.call).length;
		}
		if (it.type === 'function_call_result' && it.result) {
			chars += JSON.stringify(it.result).length;
		}
	}
	return Math.ceil(chars / 4);
}

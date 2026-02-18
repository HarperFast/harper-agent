import { curryEmitToListeners, emitToListeners } from '../ink/emitters/listener';

export function showErrorToUser(error: any, lastToolCallInfo: string | null) {
	const err: any = error ?? {};
	const name = err.name || 'Error';
	const message: string = err.message || String(err);
	const code = err.code ? ` code=${err.code}` : '';
	const status = err.status || err.statusCode || err.response?.status;
	const statusStr = status ? ` status=${status}` : '';
	const callIdMatch = message.match(/function call\s+(call_[A-Za-z0-9_-]+)/i);
	const callId = callIdMatch?.[1];
	const isNoToolOutput = /No tool output found for function call/i.test(message || '');
	const hint = isNoToolOutput
		? `\nHint: A tool likely threw or returned no result. Ensure tools always return a structured object (e.g., { status, output }) and never throw. If this followed a tool call${
			callId ? ` (${callId})` : ''
		}${lastToolCallInfo ? `: ${lastToolCallInfo}` : ''}, review that tool's implementation and logs.`
		: '';
	// Include response data if present but keep it short
	let responseDataSnippet = '';
	const data = err.response?.data ?? err.data;
	if (data) {
		try {
			const s = typeof data === 'string' ? data : JSON.stringify(data);
			responseDataSnippet = `\nResponse data: ${s.slice(0, 500)}${s.length > 500 ? '‚Ä¶' : ''}`;
		} catch {}
	}
	const stack = err.stack ? `\nStack: ${String(err.stack).split('\n').slice(0, 8).join('\n')}` : '';
	const lastTool = lastToolCallInfo ? `\nLast tool call: ${lastToolCallInfo}` : '';
	const composed = `${name}:${code}${statusStr} ${message}${hint}${lastTool}${responseDataSnippet}${stack}`;

	emitToListeners('SetInputMode', 'denied');
	setTimeout(curryEmitToListeners('SetInputMode', 'waiting'), 1000);
	emitToListeners('PushNewMessages', [{
		type: 'agent',
		text: composed,
	}]);
}

import chalk from 'chalk';
import { harperResponse } from '../utils/shell/harperResponse';
import { trackedState } from './trackedState';
import type { WithRunCompaction } from './withRunCompaction';

export function trackCompaction(session: WithRunCompaction) {
	const originalRunCompaction = session.runCompaction.bind(session);
	session.runCompaction = async (args) => {
		try {
			return await originalRunCompaction(args);
		} catch (error: any) {
			// Do not let compaction failures break the session. Provide rich diagnostics instead.
			const err: any = error ?? {};
			const name = err.name || 'Error';
			const message: string = err.message || String(err);
			const code = err.code ? ` code=${err.code}` : '';
			const status = err.status || err.statusCode || err.response?.status;
			const statusStr = status ? ` status=${status}` : '';
			const msgLower = (message || '').toLowerCase();
			const isNoToolOutput = /no tool output found for function call/i.test(message || '');
			const callIdMatch = typeof message === 'string' ? message.match(/function call\s+(call_[A-Za-z0-9_-]+)/i) : null;
			const callId = callIdMatch?.[1];
			const isRateLimited = status === 429 || /rate limit|too many requests/i.test(message || '');
			const isContextExceeded = status === 413
				|| /maximum context length|context length|too many tokens|token limit|reduce the length|content length/i.test(
					msgLower,
				);
			const isAuth = status === 401 || status === 403 || /invalid api key|unauthorized|permission/i.test(msgLower);
			const isServer = (typeof status === 'number' && status >= 500)
				|| /server error|temporary|timeout/i.test(msgLower);

			const hintParts: string[] = [];
			if (isNoToolOutput) {
				hintParts.push(
					`A previous tool call in the session history appears to be missing its tool result (orphaned tool call). `
						+ `Compaction cannot reference a tool call without a corresponding tool output. `
						+ `Ensure tools always return a structured object (e.g., { status, output }) and never throw. `
						+ (callId ? `Missing call id: ${callId}. ` : '')
						+ `If this persists, consider truncating the session before the orphaned call or retrying the failing tool.`,
				);
			}
			if (isContextExceeded) {
				hintParts.push(
					`The compaction request likely exceeded the model's context window. `
						+ `Try using a compaction model with a larger context, reducing history, or increasing compaction aggressiveness.`,
				);
			}
			if (isRateLimited) {
				hintParts.push(
					`Rate limited by the provider. Back off and retry later, or lower compaction frequency.`,
				);
			}
			if (isAuth) {
				hintParts.push(`Authentication/permissions issue. Verify the API key and model access for compaction.`);
			}
			if (isServer) {
				hintParts.push(`Upstream server error. This is likely transient; retrying later may succeed.`);
			}

			// Always include compaction context for diagnostics
			const compactionCtx = `\nContext: compactionModel=${trackedState.compactionModel || 'unknown'}`;
			let argsSnippet = '';
			try {
				const s = typeof args === 'string' ? args : JSON.stringify(args);
				if (s) { argsSnippet = `\nCompaction args: ${s.slice(0, 300)}${s.length > 300 ? '…' : ''}`; }
			} catch {}

			const hint = hintParts.length ? `\nHint (compaction): ${hintParts.join(' ')}` : '';
			let responseDataSnippet = '';
			const data = err.response?.data ?? err.data;
			if (data) {
				try {
					const s = typeof data === 'string' ? data : JSON.stringify(data);
					responseDataSnippet = `\nResponse data: ${s.slice(0, 500)}${s.length > 500 ? '…' : ''}`;
				} catch {}
			}
			const stack = err.stack ? `\nStack: ${String(err.stack).split('\n').slice(0, 8).join('\n')}` : '';
			const composed =
				`${name}:${code}${statusStr} ${message}${hint}${compactionCtx}${argsSnippet}${responseDataSnippet}${stack}`;
			harperResponse(chalk.red(composed));
			trackedState.atStartOfLine = true;
			return undefined as any;
		}
	};
}

import { emitToListeners } from '../ink/emitters/listener';
import { rateLimitTracker } from '../utils/sessions/rateLimits';

// Intercept fetch to monitor rate limit headers
const originalFetch = globalThis.fetch;

if (originalFetch) {
	globalThis.fetch = async (...args) => {
		const response = await originalFetch(...args);

		// Clone headers to a plain object for the tracker
		const headers: Record<string, string> = {};
		response.headers.forEach((value, key) => {
			headers[key] = value;
		});

		// Ensure we have some common rate limit headers even if forEach missed them
		const commonHeaders = [
			'x-ratelimit-limit-requests',
			'x-ratelimit-limit-tokens',
			'x-ratelimit-remaining-requests',
			'x-ratelimit-remaining-tokens',
			'x-ratelimit-reset-requests',
			'x-ratelimit-reset-tokens',
			'anthropic-ratelimit-requests-limit',
			'anthropic-ratelimit-requests-remaining',
			'anthropic-ratelimit-requests-reset',
			'anthropic-ratelimit-tokens-limit',
			'anthropic-ratelimit-tokens-remaining',
			'anthropic-ratelimit-tokens-reset',
			'retry-after',
		];

		for (const key of commonHeaders) {
			if (!headers[key]) {
				const val = response.headers.get(key);
				if (val) {
					headers[key] = val;
				}
			}
		}

		rateLimitTracker.updateFromHeaders(headers);
		emitToListeners('SettingsUpdated', undefined);

		const retryAfter = response.headers.get('retry-after');
		if (retryAfter) {
			const seconds = parseInt(retryAfter, 10);
			if (!isNaN(seconds) && seconds > 0) {
				emitToListeners('PushNewMessages', [{
					type: 'agent',
					text: `Rate limit reached. Sleeping for ${seconds} seconds (Retry-After)...`,
					version: 1,
				}]);
				await new Promise(resolve => setTimeout(resolve, seconds * 1000));
			}
		}

		return response;
	};
}

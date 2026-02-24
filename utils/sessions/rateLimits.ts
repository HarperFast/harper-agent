export interface RateLimitStatus {
	limitRequests: number | null;
	limitTokens: number | null;
	remainingRequests: number | null;
	remainingTokens: number | null;
	resetRequests: string | null; // e.g., "1ms", "20s", "1m0s"
	resetTokens: string | null;
	retryAfter: number | null; // seconds
}

class RateLimitTracker {
	private status: RateLimitStatus = {
		limitRequests: null,
		limitTokens: null,
		remainingRequests: null,
		remainingTokens: null,
		resetRequests: null,
		resetTokens: null,
		retryAfter: null,
	};

	public updateFromHeaders(headers: Record<string, string | string[] | undefined>) {
		const normalizedHeaders: Record<string, string | string[] | undefined> = {};
		for (const key of Object.keys(headers)) {
			normalizedHeaders[key.toLowerCase()] = headers[key];
		}

		const getHeader = (name: string) => {
			const value = normalizedHeaders[name.toLowerCase()];
			return Array.isArray(value) ? value[0] : value;
		};

		const limitRequests = getHeader('x-ratelimit-limit-requests')
			|| getHeader('anthropic-ratelimit-requests-limit')
			|| getHeader('x-ratelimit-limit')
			|| getHeader('ratelimit-limit')
			|| getHeader('x-request-limit');
		const limitTokens = getHeader('x-ratelimit-limit-tokens')
			|| getHeader('anthropic-ratelimit-tokens-limit')
			|| getHeader('x-token-limit');
		const remainingRequests = getHeader('x-ratelimit-remaining-requests')
			|| getHeader('anthropic-ratelimit-requests-remaining')
			|| getHeader('x-ratelimit-remaining')
			|| getHeader('ratelimit-remaining')
			|| getHeader('x-request-remaining');
		const remainingTokens = getHeader('x-ratelimit-remaining-tokens')
			|| getHeader('anthropic-ratelimit-tokens-remaining')
			|| getHeader('x-token-remaining');
		const resetRequests = getHeader('x-ratelimit-reset-requests')
			|| getHeader('anthropic-ratelimit-requests-reset')
			|| getHeader('x-ratelimit-reset')
			|| getHeader('ratelimit-reset')
			|| getHeader('x-request-reset');
		const resetTokens = getHeader('x-ratelimit-reset-tokens')
			|| getHeader('anthropic-ratelimit-tokens-reset')
			|| getHeader('x-token-reset');
		const retryAfter = getHeader('retry-after');

		if (limitRequests) { this.status.limitRequests = parseInt(limitRequests, 10); }
		if (limitTokens) { this.status.limitTokens = parseInt(limitTokens, 10); }
		if (remainingRequests) { this.status.remainingRequests = parseInt(remainingRequests, 10); }
		if (remainingTokens) { this.status.remainingTokens = parseInt(remainingTokens, 10); }
		if (resetRequests) { this.status.resetRequests = resetRequests; }
		if (resetTokens) { this.status.resetTokens = resetTokens; }
		if (retryAfter) { this.status.retryAfter = parseInt(retryAfter, 10); }
	}

	public isApproachingLimit(threshold: number): { requests: boolean; tokens: boolean } {
		const usage = this.getUsagePercentage();
		return {
			requests: usage.requests >= threshold,
			tokens: usage.tokens >= threshold,
		};
	}

	public getStatus(): RateLimitStatus {
		return { ...this.status };
	}

	public getUsagePercentage(): { requests: number; tokens: number } {
		const requests = this.status.limitRequests && this.status.remainingRequests !== null
			? 100 * (1 - this.status.remainingRequests / this.status.limitRequests)
			: 0;
		const tokens = this.status.limitTokens && this.status.remainingTokens !== null
			? 100 * (1 - this.status.remainingTokens / this.status.limitTokens)
			: 0;
		return { requests, tokens };
	}

	public reset() {
		this.status = {
			limitRequests: null,
			limitTokens: null,
			remainingRequests: null,
			remainingTokens: null,
			resetRequests: null,
			resetTokens: null,
			retryAfter: null,
		};
	}
}

export const rateLimitTracker = new RateLimitTracker();

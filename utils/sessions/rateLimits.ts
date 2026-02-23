export interface RateLimitStatus {
	limitRequests: number | null;
	limitTokens: number | null;
	remainingRequests: number | null;
	remainingTokens: number | null;
	resetRequests: string | null; // e.g., "1ms", "20s", "1m0s"
	resetTokens: string | null;
}

class RateLimitTracker {
	private status: RateLimitStatus = {
		limitRequests: null,
		limitTokens: null,
		remainingRequests: null,
		remainingTokens: null,
		resetRequests: null,
		resetTokens: null,
	};

	public updateFromHeaders(headers: Record<string, string | string[] | undefined>) {
		const getHeader = (name: string) => {
			const value = headers[name] || headers[name.toLowerCase()];
			return Array.isArray(value) ? value[0] : value;
		};

		const limitRequests = getHeader('x-ratelimit-limit-requests');
		const limitTokens = getHeader('x-ratelimit-limit-tokens');
		const remainingRequests = getHeader('x-ratelimit-remaining-requests');
		const remainingTokens = getHeader('x-ratelimit-remaining-tokens');
		const resetRequests = getHeader('x-ratelimit-reset-requests');
		const resetTokens = getHeader('x-ratelimit-reset-tokens');

		if (limitRequests) { this.status.limitRequests = parseInt(limitRequests, 10); }
		if (limitTokens) { this.status.limitTokens = parseInt(limitTokens, 10); }
		if (remainingRequests) { this.status.remainingRequests = parseInt(remainingRequests, 10); }
		if (remainingTokens) { this.status.remainingTokens = parseInt(remainingTokens, 10); }
		if (resetRequests) { this.status.resetRequests = resetRequests; }
		if (resetTokens) { this.status.resetTokens = resetTokens; }
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
}

export const rateLimitTracker = new RateLimitTracker();

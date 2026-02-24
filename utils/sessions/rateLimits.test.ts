import { beforeEach, describe, expect, it } from 'vitest';
import { rateLimitTracker } from './rateLimits';

describe('RateLimitTracker', () => {
	beforeEach(() => {
		rateLimitTracker.reset();
	});

	it('should update from OpenAI headers', () => {
		const headers = {
			'x-ratelimit-limit-requests': '100',
			'x-ratelimit-limit-tokens': '1000',
			'x-ratelimit-remaining-requests': '99',
			'x-ratelimit-remaining-tokens': '950',
			'x-ratelimit-reset-requests': '1s',
			'x-ratelimit-reset-tokens': '60ms',
		};

		rateLimitTracker.updateFromHeaders(headers);
		const status = rateLimitTracker.getStatus();

		expect(status.limitRequests).toBe(100);
		expect(status.limitTokens).toBe(1000);
		expect(status.remainingRequests).toBe(99);
		expect(status.remainingTokens).toBe(950);
		expect(status.resetRequests).toBe('1s');
		expect(status.resetTokens).toBe('60ms');
	});

	it('should handle case-insensitive headers', () => {
		const headers = {
			'X-RateLimit-Limit-Requests': '200',
			'X-RateLimit-Remaining-Requests': '150',
		};

		rateLimitTracker.updateFromHeaders(headers);
		const status = rateLimitTracker.getStatus();

		expect(status.limitRequests).toBe(200);
		expect(status.remainingRequests).toBe(150);
	});
	it('should update from Anthropic headers', () => {
		const headers = {
			'anthropic-ratelimit-requests-limit': '50',
			'anthropic-ratelimit-requests-remaining': '40',
			'anthropic-ratelimit-requests-reset': '2s',
			'anthropic-ratelimit-tokens-limit': '2000',
			'anthropic-ratelimit-tokens-remaining': '1800',
			'anthropic-ratelimit-tokens-reset': '100ms',
		};

		rateLimitTracker.updateFromHeaders(headers);
		const status = rateLimitTracker.getStatus();

		expect(status.limitRequests).toBe(50);
		expect(status.remainingRequests).toBe(40);
		expect(status.resetRequests).toBe('2s');
		expect(status.limitTokens).toBe(2000);
		expect(status.remainingTokens).toBe(1800);
		expect(status.resetTokens).toBe('100ms');
	});
	it('should maintain state and update only provided headers', () => {
		rateLimitTracker.updateFromHeaders({
			'x-ratelimit-limit-requests': '100',
		});
		let status = rateLimitTracker.getStatus();
		expect(status.limitRequests).toBe(100);
		expect(status.limitTokens).toBeNull();

		rateLimitTracker.updateFromHeaders({
			'x-ratelimit-limit-tokens': '500',
		});
		status = rateLimitTracker.getStatus();
		expect(status.limitRequests).toBe(100);
		expect(status.limitTokens).toBe(500);
	});
	it('should handle retry-after header', () => {
		const headers = {
			'retry-after': '30',
		};
		rateLimitTracker.updateFromHeaders(headers);
		const status = rateLimitTracker.getStatus();
		expect(status.retryAfter).toBe(30);
	});
});

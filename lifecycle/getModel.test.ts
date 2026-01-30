import { describe, expect, it, vi } from 'vitest';
import { getModel } from './getModel';

// Mocking the dependencies
vi.mock('@ai-sdk/anthropic', () => ({ anthropic: vi.fn((name) => ({ name, provider: 'anthropic' })) }));
vi.mock('@ai-sdk/google', () => ({ google: vi.fn((name) => ({ name, provider: 'google' })) }));
vi.mock('@ai-sdk/openai', () => ({ openai: vi.fn((name) => ({ name, provider: 'openai' })) }));
vi.mock('@openai/agents-extensions', () => ({ aisdk: vi.fn((model) => ({ wrapped: model })) }));
vi.mock('ollama-ai-provider-v2', () => ({
	ollama: vi.fn((name) => ({ name, provider: 'ollama' })),
	createOllama: vi.fn(() => vi.fn((name) => ({ name, provider: 'ollama-custom' }))),
}));

describe('getModel', () => {
	it('should return default string for null modelName', () => {
		expect(getModel(null)).toBe('gpt-5.2');
	});

	it('should return default string for gpt-5.2', () => {
		expect(getModel('gpt-5.2')).toBe('gpt-5.2');
	});

	it('should return wrapped anthropic model for claude- models', () => {
		const result: any = getModel('claude-3-sonnet');
		expect(result.wrapped.provider).toBe('anthropic');
		expect(result.wrapped.name).toBe('claude-3-sonnet');
	});

	it('should return wrapped google model for gemini- models', () => {
		const result: any = getModel('gemini-pro');
		expect(result.wrapped.provider).toBe('google');
		expect(result.wrapped.name).toBe('gemini-pro');
	});

	it('should return wrapped openai model for other models', () => {
		const result: any = getModel('gpt-4o');
		expect(result.wrapped.provider).toBe('openai');
		expect(result.wrapped.name).toBe('gpt-4o');
	});

	it('should return wrapped ollama model for ollama- models', () => {
		const result: any = getModel('ollama-llama3');
		expect(result.wrapped.provider).toBe('ollama');
		expect(result.wrapped.name).toBe('llama3');
	});

	it('should use OLLAMA_BASE_URL if provided', () => {
		process.env.OLLAMA_BASE_URL = 'http://localhost:11434';
		const result: any = getModel('ollama-llama3');
		expect(result.wrapped.provider).toBe('ollama-custom');
		expect(result.wrapped.name).toBe('llama3');
		delete process.env.OLLAMA_BASE_URL;
	});
});

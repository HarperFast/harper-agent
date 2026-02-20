import { describe, expect, it, vi } from 'vitest';
import { getModel, getProvider, isOpenAIModel } from './getModel';

// Mocking the dependencies
vi.mock('@ai-sdk/anthropic', () => ({ anthropic: vi.fn((name) => ({ name, provider: 'anthropic' })) }));
vi.mock('@ai-sdk/google', () => ({ google: vi.fn((name) => ({ name, provider: 'google' })) }));
vi.mock('@ai-sdk/openai', () => ({ openai: vi.fn((name) => ({ name, provider: 'openai' })) }));
vi.mock('@openai/agents-extensions', () => ({ aisdk: vi.fn((model) => ({ wrapped: model })) }));
vi.mock('ollama-ai-provider-v2', () => ({
	ollama: vi.fn((name) => ({ name, provider: 'ollama' })),
	createOllama: vi.fn((config) => {
		const provider = vi.fn((name) => ({ name, provider: 'ollama-custom', baseURL: config.baseURL }));
		return provider;
	}),
}));

describe('getModel', () => {
	it('should return default string for gpt-5.2', () => {
		const result: any = getModel('gpt-5.2');
		expect(result.wrapped.provider).toBe('openai');
		expect(result.wrapped.name).toBe('gpt-5.2');
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
		process.env.OLLAMA_BASE_URL = 'http://localhost:11434/api';
		const result: any = getModel('ollama-llama3');
		expect(result.wrapped.provider).toBe('ollama-custom');
		expect(result.wrapped.baseURL).toBe('http://localhost:11434/api');
		delete process.env.OLLAMA_BASE_URL;
	});

	it('should normalize OLLAMA_BASE_URL - add http, port and /api', () => {
		process.env.OLLAMA_BASE_URL = '192.168.13.37';
		const result: any = getModel('ollama-llama3');
		expect(result.wrapped.baseURL).toBe('http://192.168.13.37:11434/api');
		delete process.env.OLLAMA_BASE_URL;
	});

	it('should normalize OLLAMA_BASE_URL - add port and /api if missing', () => {
		process.env.OLLAMA_BASE_URL = 'https://my-ollama-server';
		const result: any = getModel('ollama-llama3');
		expect(result.wrapped.baseURL).toBe('https://my-ollama-server:11434/api');
		delete process.env.OLLAMA_BASE_URL;
	});

	it('should normalize OLLAMA_BASE_URL - add /api if missing but port exists', () => {
		process.env.OLLAMA_BASE_URL = 'http://localhost:12345';
		const result: any = getModel('ollama-llama3');
		expect(result.wrapped.baseURL).toBe('http://localhost:12345/api');
		delete process.env.OLLAMA_BASE_URL;
	});

	it('should normalize OLLAMA_BASE_URL - handle trailing slash and add /api', () => {
		process.env.OLLAMA_BASE_URL = 'http://localhost:11434/';
		const result: any = getModel('ollama-llama3');
		expect(result.wrapped.baseURL).toBe('http://localhost:11434/api');
		delete process.env.OLLAMA_BASE_URL;
	});

	it('should normalize OLLAMA_BASE_URL - add port even if /api is present', () => {
		process.env.OLLAMA_BASE_URL = 'http://localhost/api';
		const result: any = getModel('ollama-llama3');
		expect(result.wrapped.baseURL).toBe('http://localhost:11434/api');
		delete process.env.OLLAMA_BASE_URL;
	});

	it('should normalize OLLAMA_BASE_URL - handle trailing slash after /api', () => {
		process.env.OLLAMA_BASE_URL = 'http://localhost:11434/api/';
		const result: any = getModel('ollama-llama3');
		expect(result.wrapped.baseURL).toBe('http://localhost:11434/api');
		delete process.env.OLLAMA_BASE_URL;
	});

	describe('isOpenAIModel', () => {
		it('should return true for gpt-5.2', () => {
			expect(isOpenAIModel('gpt-5.2')).toBe(true);
		});

		it('should return true for gpt-4o', () => {
			expect(isOpenAIModel('gpt-4o')).toBe(true);
		});

		it('should return false for claude- models', () => {
			expect(isOpenAIModel('claude-3-sonnet')).toBe(false);
		});

		it('should return false for gemini- models', () => {
			expect(isOpenAIModel('gemini-pro')).toBe(false);
		});

		it('should return false for ollama- models', () => {
			expect(isOpenAIModel('ollama-llama3')).toBe(false);
		});
	});

	describe('getProvider', () => {
		it('should return OpenAI for generic models', () => {
			expect(getProvider('gpt-5.2')).toBe('OpenAI');
			expect(getProvider('gpt-4o')).toBe('OpenAI');
			expect(getProvider('something-else')).toBe('OpenAI');
		});

		it('should return Anthropic for claude- models', () => {
			expect(getProvider('claude-3-sonnet')).toBe('Anthropic');
			expect(getProvider('claude-3-5-haiku')).toBe('Anthropic');
		});

		it('should return Google for gemini- models', () => {
			expect(getProvider('gemini-pro')).toBe('Google');
			expect(getProvider('gemini-1.5-flash')).toBe('Google');
		});

		it('should return Ollama for ollama- models', () => {
			expect(getProvider('ollama-llama3')).toBe('Ollama');
			expect(getProvider('ollama-qwen')).toBe('Ollama');
		});
	});
});

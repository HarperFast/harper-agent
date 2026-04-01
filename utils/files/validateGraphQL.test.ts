import { existsSync, readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { _resetCache, validateGraphQL } from './validateGraphQL';

vi.mock('node:fs', () => ({
	existsSync: vi.fn(),
	readFileSync: vi.fn(),
}));

describe('validateGraphQL', () => {
	const root = '/root';
	const schemaContent = `
		scalar Date
		directive @table(table: String, database: String) on OBJECT
		directive @primaryKey on FIELD_DEFINITION
	`;

	beforeEach(() => {
		vi.clearAllMocks();
		_resetCache();
	});

	it('should return null for non-graphql files', () => {
		const result = validateGraphQL('some content', 'test.txt', root);
		expect(result).toBeNull();
	});

	it('should return null for valid GraphQL with HarperDB schema', () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue(schemaContent);

		const content = 'type User @table { id: ID @primaryKey name: String }';
		const result = validateGraphQL(content, 'test.graphql', root);
		expect(result).toBeNull();
	});

	it('should return syntax error for invalid GraphQL syntax', () => {
		const content = 'type User { id: ID!! }';
		const result = validateGraphQL(content, 'test.graphql', root);
		expect(result).toContain('GraphQL syntax error');
		expect(result).toContain('Expected Name, found "!"');
	});

	it('should return validation error for unknown directives', () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue(schemaContent);

		const content = 'type User @unknown { id: ID }';
		const result = validateGraphQL(content, 'test.graphql', root);
		expect(result).toContain('GraphQL validation error');
		expect(result).toContain('Unknown directive "@unknown"');
	});

	it('should return validation error for unknown scalars', () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue(schemaContent);

		const content = 'type User { id: UnknownScalar }';
		const result = validateGraphQL(content, 'test.graphql', root);
		expect(result).toContain('GraphQL validation error');
		expect(result).toContain('Unknown type "UnknownScalar"');
	});

	it('should handle missing HarperDB schema gracefully (only syntax check)', () => {
		// Mock a non-existent schema
		vi.mocked(existsSync).mockReturnValue(false);

		const content = 'type User @unknown { id: ID }';
		const result = validateGraphQL(content, 'test.graphql', '/no-schema');

		expect(result).toBeNull();
	});

	it('should fallback to local schema if node_modules schema is missing', () => {
		const localSchemaContent = 'directive @local on OBJECT';

		vi.mocked(existsSync).mockImplementation((p: any) => {
			if (p.includes('node_modules')) { return false; }
			if (p.endsWith('schema.graphql')) { return true; }
			return false;
		});
		vi.mocked(readFileSync).mockImplementation((p: any) => {
			if (p.endsWith('schema.graphql')) { return localSchemaContent; }
			throw new Error('File not found');
		});

		const content = 'type User @local { id: ID }';
		// Use a unique root to bypass cache if it was already set in other tests
		const result = validateGraphQL(content, 'test.graphql', '/fallback-test-root');
		expect(result).toBeNull();
	});
});

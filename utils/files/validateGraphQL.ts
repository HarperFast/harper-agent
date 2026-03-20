import { buildSchema, extendSchema, parse, validateSchema } from 'graphql';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let cachedSchema: any = null;

export function _resetCache() {
	cachedSchema = null;
}

function getHarperSchema(root: string) {
	if (cachedSchema) { return cachedSchema; }

	const paths = [
		path.join(root, 'node_modules', 'harperdb', 'schema.graphql'),
		path.join(__dirname, 'schema.graphql'),
		path.join(__dirname, '..', 'schema.graphql'),
		path.join(__dirname, '..', '..', 'schema.graphql'),
	];

	for (const schemaPath of paths) {
		if (existsSync(schemaPath)) {
			try {
				const schemaSource = readFileSync(schemaPath, 'utf8');
				// Use buildSchema but don't validate it as a full executable schema
				// We want to use it for validating SDL.
				cachedSchema = buildSchema(schemaSource, { assumeValidSDL: true });
				return cachedSchema;
			} catch (e) {
				console.error(`Error parsing HarperDB schema at ${schemaPath}:`, e);
			}
		}
	}
	return null;
}

export function validateGraphQL(content: string, filePath: string, root: string): string | null {
	if (!filePath.endsWith('.graphql')) {
		return null;
	}

	try {
		const document = parse(content);
		const schema = getHarperSchema(root);

		if (schema) {
			// Validate that the SDL content extends the HarperDB schema correctly.
			// This will catch unknown directives, scalars, and basic SDL errors.
			const extendedSchema = extendSchema(schema, document, { assumeValidSDL: false });
			const errors = validateSchema(extendedSchema).filter(e =>
				!e.message.includes('Query root type must be provided')
			);
			if (errors.length > 0) {
				return `GraphQL validation error in ${filePath}:\n${errors.map((e) => e.message).join('\n')}`;
			}
		}
		return null;
	} catch (err: any) {
		const message = err.message || String(err);
		const type = message.includes('Syntax Error') ? 'syntax' : 'validation';
		return `GraphQL ${type} error in ${filePath}: ${message}`;
	}
}

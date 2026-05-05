import { buildSchema } from 'graphql';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let cachedSchema: any = null;

export function _resetCache() {
	cachedSchema = null;
}

export function getHarperSchemaContent(root: string): string | null {
	if (cachedSchema) { return cachedSchema; }

	const paths = [
		path.join(root, 'node_modules', 'harperdb', 'schema.graphql'),
		path.join(root, 'node_modules', 'harper', 'schema.graphql'),
		path.join(__dirname, 'schema.graphql'),
		path.join(__dirname, '..', 'schema.graphql'),
		path.join(__dirname, '..', '..', 'schema.graphql'),
	];

	for (const schemaPath of paths) {
		if (existsSync(schemaPath)) {
			try {
				return readFileSync(schemaPath, 'utf8');
			} catch (e) {
				console.error(`Error parsing HarperDB schema at ${schemaPath}:`, e);
			}
		}
	}
	return null;
}

export function getHarperSchemaBuilt(root: string) {
	if (cachedSchema) { return cachedSchema; }

	const schemaSource = getHarperSchemaContent(root);
	if (schemaSource) {
		cachedSchema = buildSchema(schemaSource, { assumeValidSDL: true });
		return cachedSchema;
	}
	return null;
}

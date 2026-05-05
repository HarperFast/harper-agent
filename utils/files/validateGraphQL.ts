import { extendSchema, parse, validateSchema } from 'graphql';
import { getHarperSchemaBuilt } from './getHarperSchema';

export function validateGraphQL(content: string, filePath: string, root: string): string | null {
	if (!filePath.endsWith('.graphql')) {
		return null;
	}

	try {
		const document = parse(content);
		const schema = getHarperSchemaBuilt(root);

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

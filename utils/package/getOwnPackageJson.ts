import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export function getOwnPackageJson() {
	try {
		const packageContents = readFileSync(join(__dirname, '../package.json'), 'utf-8');
		return JSON.parse(packageContents);
	} catch {
		return { name: 'hairper', version: '0.0.0' };
	}
}

import { isPackageManagerAvailable } from './isPackageManagerAvailable';

export type PackageManager = 'yarn' | 'pnpm' | 'bun' | 'deno' | 'npm';

export function pickPreferredPackageManager(): PackageManager {
	// Prefer non-npm options if available
	const preferred: PackageManager[] = ['yarn', 'pnpm', 'bun', 'deno'];
	for (const pm of preferred) {
		if (isPackageManagerAvailable(pm)) { return pm; }
	}
	return 'npm';
}

export const PM_DISPLAY: Record<PackageManager, string> = {
	yarn: 'Yarn',
	pnpm: 'PNPM',
	bun: 'Bun',
	deno: 'Deno',
	npm: 'NPM',
};

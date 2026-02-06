import type { PackageManager } from './pickPreferredPackageManager';

export function buildCreateCommand(
	pm: PackageManager,
	appName: string,
	template: string,
): { cmd: string; label: string } {
	switch (pm) {
		case 'deno':
			// Deno's init command doesn't follow the exact same flags; use provided invocation
			return { cmd: `deno init --npm harper "${appName}" 2>&1`, label: 'deno init --npm harper' };
		case 'npm':
			return {
				cmd: `npm create harper@latest --yes "${appName}" -- --no-interactive --template ${template} 2>&1`,
				label: 'npm create harper@latest',
			};
		default:
			// yarn/pnpm/bun share the same shape
			return {
				cmd: `${pm} create harper "${appName}" --no-interactive --template ${template} 2>&1`,
				label: `${pm} create harper`,
			};
	}
}

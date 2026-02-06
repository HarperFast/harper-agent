import { execSync } from 'node:child_process';

export function isPackageManagerAvailable(cmd: string): boolean {
	try {
		// Using --version is portable across these CLIs
		execSync(`${cmd} --version`, { stdio: 'ignore' });
		return true;
	} catch {
		return false;
	}
}

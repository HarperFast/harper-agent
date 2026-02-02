import chalk from 'chalk';
import spawn from 'cross-spawn';
import { getLatestVersion } from './getLatestVersion';
import { getOwnPackageJson } from './getOwnPackageJson';
import { isVersionNewer } from './isVersionNewer';

/**
 * Checks if a newer version of hairper is available on npm.
 * If a newer version exists, it attempts to re-run the process using npx with the latest version.
 */
export async function checkForUpdate(): Promise<string> {
	const pkg = getOwnPackageJson();
	const packageName = pkg.name;
	const packageVersion = pkg.version;

	if (process.env.HAIRPER_SKIP_UPDATE) {
		return packageVersion;
	}

	try {
		const latestVersion = await getLatestVersion(packageName);

		if (latestVersion && isVersionNewer(latestVersion, packageVersion)) {
			console.log(
				chalk.yellow(
					`\nA new version of ${chalk.bold(packageName)} is available! (${chalk.dim(packageVersion)} -> ${
						chalk.green(latestVersion)
					})`,
				),
			);
			console.log(`Automatically updating to the latest version...\n`);

			// Clear the npx cache for this package to ensure we get the latest version
			const lsResult = spawn.sync('npm', ['cache', 'npx', 'ls', packageName], {
				encoding: 'utf-8',
			});

			if (lsResult.stdout) {
				const keys = lsResult.stdout
					.split('\n')
					.map((line) => line.trim())
					.filter((line) => line.includes(':'))
					.filter((line) => {
						const [, pkgPart] = line.split(':');
						return pkgPart && pkgPart.trim().startsWith(`${packageName}@`);
					})
					.map((line) => line.split(':')[0]!.trim());

				if (keys.length > 0) {
					spawn.sync('npm', ['cache', 'npx', 'rm', ...keys], {
						stdio: 'inherit',
					});
				}
			}

			const result = spawn.sync('npx', ['-y', `${packageName}@latest`, ...process.argv.slice(2)], {
				stdio: 'inherit',
			});

			process.exit(result.status ?? 0);
		}
	} catch {
		// Ignore errors, we don't want to block the user if the check fails
	}

	return packageVersion;
}

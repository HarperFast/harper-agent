import { Select } from '@inkjs/ui';
import chalk from 'chalk';
import spawn from 'cross-spawn';
import { Box, render, Text } from 'ink';
import React from 'react';
import { updateEnv } from '../files/updateEnv';
import { getLatestVersion } from './getLatestVersion';
import { getOwnPackageJson } from './getOwnPackageJson';
import { isVersionNewer } from './isVersionNewer';

/**
 * Checks if a newer version of harper-agent is available on npm.
 * If a newer version exists, offer a simple single-select UI to choose what to do.
 */
export async function checkForUpdate(): Promise<string> {
	const pkg = getOwnPackageJson();
	const packageName = pkg.name;
	const packageVersion = pkg.version;

	if (process.env.HARPER_AGENT_SKIP_UPDATE) {
		return packageVersion;
	}

	try {
		const latestVersion = await getLatestVersion(packageName);

		if (latestVersion && isVersionNewer(latestVersion, packageVersion)) {
			const choice = await promptForUpdateChoice(packageName, packageVersion, latestVersion);

			if (choice === 'later') {
				return packageVersion;
			}

			if (choice === 'never') {
				updateEnv('HARPER_AGENT_SKIP_UPDATE', '1');
				return packageVersion;
			}

			// choice === 'now' -> attempt update and restart
			// Check if we are running from a global installation
			let isGlobal = false;
			try {
				const globalRootResult = spawn.sync('npm', ['root', '-g'], { encoding: 'utf8' });
				const globalRoot = globalRootResult.stdout?.trim();
				if (globalRoot && process.argv[1] && process.argv[1].startsWith(globalRoot)) {
					isGlobal = true;
				}
			} catch {
				// Ignore and proceed with npx route
			}

			if (isGlobal) {
				spawn.sync('npm', ['install', '-g', `${packageName}@latest`], { stdio: 'inherit' });
				const result = spawn.sync('harper-agent', process.argv.slice(2), { stdio: 'inherit' });
				process.exit(result.status ?? 0);
			}

			// Clear the npx cache for this package to ensure we get the latest version
			const lsResult = spawn.sync('npm', ['cache', 'npx', 'ls', packageName], { encoding: 'utf8' });
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
					spawn.sync('npm', ['cache', 'npx', 'rm', ...keys], { stdio: 'inherit' });
				}
			}

			const result = spawn.sync('npx', ['-y', `${packageName}@latest`, ...process.argv.slice(2)], { stdio: 'inherit' });
			process.exit(result.status ?? 0);
		}
	} catch {
		// Ignore errors, we don't want to block the user if the check fails
	}

	return packageVersion;
}

// --- UI helpers ---
type UpdateChoice = 'now' | 'later' | 'never';

function promptForUpdateChoice(pkgName: string, currentVersion: string, latestVersion: string): Promise<UpdateChoice> {
	return new Promise<UpdateChoice>((resolve) => {
		const app = render(
			React.createElement(UpdatePrompt, {
				packageName: pkgName,
				currentVersion,
				latestVersion,
				onSelect: (c: UpdateChoice) => {
					resolve(c);
					app.unmount();
				},
			}),
		);
	});
}

function UpdatePrompt({ packageName, currentVersion, latestVersion, onSelect }: {
	packageName: string;
	currentVersion: string;
	latestVersion: string;
	onSelect: (choice: UpdateChoice) => void;
}) {
	const options = [
		{
			label: `Update right now (will run: npx -y @harperfast/agent@latest)`,
			value: 'now' as const,
		},
		{ label: 'Update later', value: 'later' as const },
		{ label: 'Don’t ask again', value: 'never' as const },
	];
	return React.createElement(
		Box,
		{ flexDirection: 'column', padding: 1 },
		React.createElement(
			Text,
			null,
			`${chalk.yellow('Update available:')} ${chalk.bold(packageName)} ${chalk.dim(`v${currentVersion}`)} → ${
				chalk.green(`v${latestVersion}`)
			}`,
		),
		React.createElement(
			Box,
			{ marginTop: 1 },
			React.createElement(Select as any, {
				options,
				onChange: (v: any) => onSelect(v as UpdateChoice),
			}),
		),
	);
}

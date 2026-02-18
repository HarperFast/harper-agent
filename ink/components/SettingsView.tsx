import { Box, Text } from 'ink';
import path from 'node:path';
import React, { useMemo } from 'react';
import { useSettings } from '../contexts/SettingsContext';

export function SettingsView() {
	const { model, compactionModel, sessionPath, cwd, useFlexTier, maxTurns, maxCost } = useSettings();

	const displayPath = useMemo(() => {
		if (!sessionPath) { return null; }
		const relative = path.relative(cwd, sessionPath);
		if (!relative.startsWith('..') && !path.isAbsolute(relative)) {
			return `./${relative}`;
		}
		return sessionPath;
	}, [cwd, sessionPath]);

	return (
		<Box flexDirection="column" flexGrow={1}>
			<Box marginBottom={1} flexDirection="column">
				<Text bold color="yellow">MODEL:</Text>
				<Text>{model}</Text>
			</Box>
			<Box marginBottom={1} flexDirection="column">
				<Text bold color="yellow">COMPACTION MODEL:</Text>
				<Text>{compactionModel}</Text>
			</Box>
			{displayPath && (
				<Box marginBottom={1} flexDirection="column">
					<Text bold color="yellow">SESSION PATH:</Text>
					<Text>{displayPath}</Text>
				</Box>
			)}
			<Box marginBottom={1} flexDirection="column">
				<Text bold color="yellow">FLEX TIER:</Text>
				<Text>{useFlexTier ? 'Yes' : 'No'}</Text>
			</Box>
			<Box marginBottom={1} flexDirection="column">
				<Text bold color="yellow">MAX TURNS:</Text>
				<Text>{maxTurns}</Text>
			</Box>
			{maxCost !== null && (
				<Box marginBottom={1} flexDirection="column">
					<Text bold color="yellow">MAX COST:</Text>
					<Text>${maxCost.toFixed(2)}</Text>
				</Box>
			)}
		</Box>
	);
}

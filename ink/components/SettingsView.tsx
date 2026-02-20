import { Box, Text } from 'ink';
import path from 'node:path';
import React, { useMemo } from 'react';
import { useSettings } from '../contexts/SettingsContext';

export function SettingsView({ isDense = false }: { isDense?: boolean }) {
	const { model, compactionModel, sessionPath, cwd, useFlexTier, maxTurns, maxCost } = useSettings();

	const displayPath = useMemo(() => {
		if (!sessionPath) { return null; }
		const relative = path.relative(cwd, sessionPath);
		if (!relative.startsWith('..') && !path.isAbsolute(relative)) {
			return `./${relative}`;
		}
		return sessionPath;
	}, [cwd, sessionPath]);

	const marginBottom = isDense ? 0 : 1;

	return (
		<Box flexDirection="column" flexGrow={1} paddingLeft={1}>
			<Box marginBottom={marginBottom}>
				<Text bold underline color="cyan">Configuration</Text>
			</Box>

			<Box marginBottom={marginBottom}>
				<Box width={20}>
					<Text>Model:</Text>
				</Box>
				<Text>{model}</Text>
			</Box>
			<Box marginBottom={marginBottom}>
				<Box width={20}>
					<Text>Compaction Model:</Text>
				</Box>
				<Text>{compactionModel}</Text>
			</Box>
			{displayPath && (
				<Box marginBottom={marginBottom}>
					<Box width={20}>
						<Text>Session Path:</Text>
					</Box>
					<Text>{displayPath}</Text>
				</Box>
			)}
			<Box marginBottom={marginBottom}>
				<Box width={20}>
					<Text>Flex Tier:</Text>
				</Box>
				<Text>{useFlexTier ? 'Yes' : 'No'}</Text>
			</Box>
			<Box marginBottom={marginBottom}>
				<Box width={20}>
					<Text>Max Turns:</Text>
				</Box>
				<Text>{maxTurns}</Text>
			</Box>
			{maxCost !== null && (
				<Box marginBottom={marginBottom}>
					<Box width={20}>
						<Text>Max Cost:</Text>
					</Box>
					<Text>${maxCost.toFixed(2)}</Text>
				</Box>
			)}
		</Box>
	);
}

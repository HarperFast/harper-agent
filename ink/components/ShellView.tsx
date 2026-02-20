import { Box, Text, useInput } from 'ink';
import React, { useCallback, useEffect, useState } from 'react';
import { useShell } from '../contexts/ShellContext';
import type { ShellCommand } from '../models/shellCommand';
import { ShellCommandItem } from './ShellCommandItem';
import { VirtualList } from './VirtualList';

interface Props {
	height: number;
	isFocused: boolean;
}

export function ShellView({ height, isFocused }: Props) {
	const { commands } = useShell();
	const [selectedIndex, setSelectedIndex] = useState(0);

	useEffect(() => {
		setSelectedIndex(commands.length - 1);
	}, [commands.length]);

	useInput((_, key) => {
		if (!isFocused) { return; }

		if (key.upArrow) {
			setSelectedIndex(prev => Math.max(0, prev - 1));
		}

		if (key.downArrow) {
			setSelectedIndex(prev => Math.min(commands.length - 1, prev + 1));
		}
	});

	if (commands.length === 0) {
		return (
			<Box flexDirection="column" flexGrow={1} height={height}>
				<Box>
					<Text color="gray" dimColor>│</Text>
					<Text italic color="gray">
						No shell commands have been executed yet.
					</Text>
				</Box>
				{Array.from({ length: height - 1 }).map((_, i) => (
					<Box key={i}>
						<Text color="gray" dimColor>│</Text>
					</Box>
				))}
			</Box>
		);
	}

	const getItemHeight = (_item: ShellCommand) => {
		return 2; // Status line + Args line
	};

	return (
		<Box flexDirection="column" flexGrow={1}>
			<VirtualList
				items={commands}
				getItemHeight={getItemHeight}
				height={height}
				selectedIndex={selectedIndex}
				renderOverflowTop={useCallback((count: number) => (
					<Box>
						<Text color="gray" dimColor>│</Text>
						{count > 0 && <Text dimColor>▲ {count} more</Text>}
					</Box>
				), [])}
				renderOverflowBottom={useCallback((count: number) => (
					<Box>
						<Text color="gray" dimColor>│</Text>
						{count > 0 && <Text dimColor>▼ {count} more</Text>}
					</Box>
				), [])}
				renderFiller={useCallback((h: number) => (
					<Box flexDirection="column">
						{Array.from({ length: h }).map((_, i) => (
							<Box key={i}>
								<Text color="gray" dimColor>│</Text>
							</Box>
						))}
					</Box>
				), [])}
				renderItem={({ item, isSelected }) => <ShellCommandItem command={item} isSelected={isSelected} />}
			/>
		</Box>
	);
}

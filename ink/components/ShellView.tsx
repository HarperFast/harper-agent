import { Box, Text, useInput } from 'ink';
import React, { useEffect, useState } from 'react';
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
			<Box flexDirection="column" flexGrow={1}>
				<Text italic color="gray">
					No shell commands have been executed yet.
				</Text>
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
				renderOverflowBottom={() => undefined}
				renderItem={({ item, isSelected }) => <ShellCommandItem command={item} isSelected={isSelected} />}
			/>
		</Box>
	);
}

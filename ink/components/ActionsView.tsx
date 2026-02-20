import { Box, Text, useInput } from 'ink';
import React, { useCallback, useEffect, useState } from 'react';
import { useActions } from '../contexts/ActionsContext';
import { useTerminalSize } from '../library/useTerminalSize';
import type { ActionItem } from '../models/actionItem';
import { ActionItemRow } from './ActionItemRow';
import { VirtualList } from './VirtualList';

interface Props {
	height: number;
	isFocused: boolean;
}

export function ActionsView({ height, isFocused }: Props) {
	const { actions } = useActions();
	const [selectedIndex, setSelectedIndex] = useState(0);

	const size = useTerminalSize();
	const timelineWidth = Math.floor(size.columns * 0.65);
	const statusWidth = size.columns - timelineWidth;

	useEffect(() => {
		if (actions.length > 0) {
			setSelectedIndex(actions.length - 1);
		}
	}, [actions.length]);

	useInput((_, key) => {
		if (!isFocused) { return; }

		if (key.upArrow) {
			setSelectedIndex(prev => Math.max(0, prev - 1));
		}

		if (key.downArrow) {
			setSelectedIndex(prev => Math.min(actions.length - 1, prev + 1));
		}
	});

	const renderOverflowTop = useCallback((count: number) => (
		<Box>
			<Text color="gray" dimColor>│</Text>
			{count > 0 && <Text dimColor>{' '}▲ {count} more</Text>}
		</Box>
	), []);

	const renderOverflowBottom = useCallback((count: number) => (
		<Box>
			<Text color="gray" dimColor>│</Text>
			{count > 0 && <Text dimColor>{' '}▼ {count} more</Text>}
		</Box>
	), []);

	const renderFiller = useCallback((h: number) => (
		<Box flexDirection="column">
			{Array.from({ length: h }).map((_, i) => (
				<Box key={i}>
					<Text></Text>
				</Box>
			))}
		</Box>
	), []);

	const getItemHeight = useCallback((_item: ActionItem) => 1, []);

	if (actions.length === 0) {
		return (
			<Box flexDirection="column" flexGrow={1} height={height}>
				<Box>
					<Text italic color="gray">
						No actions yet.
					</Text>
				</Box>
				{Array.from({ length: height - 1 }).map((_, i) => (
					<Box key={i}>
						<Text></Text>
					</Box>
				))}
			</Box>
		);
	}

	return (
		<Box flexDirection="column" flexGrow={1}>
			<VirtualList
				items={actions}
				getItemHeight={getItemHeight}
				height={height}
				selectedIndex={selectedIndex}
				renderOverflowTop={renderOverflowTop}
				renderOverflowBottom={renderOverflowBottom}
				renderFiller={renderFiller}
				renderItem={({ item, isSelected }) => (
					<ActionItemRow item={item} isSelected={isSelected} isFocused={isFocused} width={statusWidth - 2} />
				)}
			/>
		</Box>
	);
}

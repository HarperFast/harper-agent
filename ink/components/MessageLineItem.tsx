import { Box, Text } from 'ink';
import React, { memo } from 'react';
import type { Message } from '../models/message';

export interface LineItem {
	key: string;
	messageId: number;
	type: Message['type'];
	text: string;
	isFirstLine: boolean;
	isArgsLine?: boolean;
}

export const MessageLineItem = memo(({ item, isSelected }: { item: LineItem; isSelected: boolean }) => {
	const color = messageTypeToColor(item.type);
	const label = item.type === 'interrupted' ? '- thought interrupted with esc key -' : item.type.toUpperCase();

	return (
		<Box>
			{isSelected && (
				<Text color="gray" bold>
					❯{' '}
				</Text>
			)}
			{/* Label only on the first content line for a message */}
			{item.isFirstLine
				? (
					<Text>
						<Text bold color={color}>
							{label}
							{item.isArgsLine ? ' args: ' : ': '}
						</Text>
						<Text dimColor={!!item.isArgsLine} italic={!!item.isArgsLine}>
							{item.text}
						</Text>
					</Text>
				)
				: (
					<Text>
						{/* indent to align with where text starts on first line (label + ": ") is handled upstream via padding in container */}
						<Text dimColor={!!item.isArgsLine} italic={!!item.isArgsLine}>{item.text}</Text>
					</Text>
				)}
		</Box>
	);
});

function messageTypeToColor(type: Message['type']) {
	switch (type) {
		case 'user':
			return 'green';
		case 'agent':
			return 'cyan';
		case 'interrupted':
			return 'gray';
		default:
			return 'magenta';
	}
}

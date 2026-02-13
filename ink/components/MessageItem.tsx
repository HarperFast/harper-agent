import { Box, Text } from 'ink';
import React, { memo } from 'react';
import type { Message } from '../models/message';

// Memoized message item for performance
export const MessageItem = memo(({ message, isSelected }: { message: Message; isSelected: boolean }) => {
	const color = messageTypeToColor(message.type);
	const label = message.type === 'interrupted' ? '- thought interrupted with esc key -' : message.type.toUpperCase();

	return (
		<Box flexDirection="column" paddingLeft={isSelected ? 0 : 2}>
			<Box>
				{isSelected && (
					<Text color="gray" bold>
						❯{' '}
					</Text>
				)}
				<Text>
					<Text bold color={color}>
						{label}
						{message.text ? ': ' : ''}
					</Text>
					<Text>{message.text}</Text>
				</Text>
			</Box>
			{message.args && (
				<Box paddingLeft={isSelected ? 2 : 0}>
					<Text dimColor italic wrap="truncate-end">
						Args: {message.args}
					</Text>
				</Box>
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

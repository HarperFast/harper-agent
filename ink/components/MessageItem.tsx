import { Box, Text } from 'ink';
import React, { memo } from 'react';
import type { Message } from '../models/message';

// Memoized message item for performance
export const MessageItem = memo(({ message, isSelected }: { message: Message; isSelected: boolean }) => {
	const color = messageTypeToColor(message.type);
	const label = message.type === 'interrupted' ? '- thought interrupted with esc key -' : message.type.toUpperCase();
	const pipe = (
		<Text color={isSelected ? 'blue' : 'gray'} dimColor={!isSelected} bold={isSelected}>
			{isSelected ? '┃  ' : '│  '}
		</Text>
	);

	return (
		<Box flexDirection="column">
			<Box>
				{pipe}
				<Text>
					<Text bold color={color}>
						{label}
						{message.text ? ': ' : ''}
					</Text>
					<Text>{message.text}</Text>
				</Text>
			</Box>
			{message.args && (
				<Box>
					{pipe}
					<Box paddingLeft={2}>
						<Text dimColor italic wrap="truncate-end">
							Args: {message.args}
						</Text>
					</Box>
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

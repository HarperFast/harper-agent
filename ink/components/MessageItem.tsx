import { Box, Text } from 'ink';
import React, { memo } from 'react';
import type { Message } from '../models/message';

// Memoized message item for performance
export const MessageItem = memo(({ message, isSelected }: { message: Message; isSelected: boolean }) => {
	const labelColor = messageTypeToLabelColor(message.type);
	const textColor = messageTypeToTextColor(message.type);
	const label = message.type === 'interrupted' ? '' : message.type.toUpperCase();
	const pipe = (
		<Text color={isSelected ? 'cyan' : 'gray'} dimColor={!isSelected} bold={isSelected}>
			{isSelected ? '┃  ' : '│  '}
		</Text>
	);

	return (
		<Box flexDirection="column">
			<Box>
				{pipe}
				<Text>
					{label && (
						<Text bold color={labelColor}>
							{label}
							{message.text ? ': ' : ''}
						</Text>
					)}
					<Text color={textColor}>{message.text}</Text>
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

function messageTypeToLabelColor(type: Message['type']) {
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

function messageTypeToTextColor(type: Message['type']) {
	switch (type) {
		case 'interrupted':
			return 'gray';
		case 'user':
		case 'agent':
		default:
			return 'white';
	}
}

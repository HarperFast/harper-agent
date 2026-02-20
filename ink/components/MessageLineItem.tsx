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
	toolName?: string;
}

export const MessageLineItem = memo(
	({
		item,
		isSelected,
		isFocused,
		indent = 0,
	}: {
		item: LineItem;
		isSelected: boolean;
		isFocused: boolean;
		indent?: number;
	}) => {
		const color = messageTypeToColor(item.type);
		const label = item.type === 'interrupted' ? '- thought interrupted with esc key -' : item.type.toUpperCase();

		const selectionColor = isFocused ? 'blue' : 'gray';

		return (
			<Box>
				<Text color={isSelected ? selectionColor : 'gray'} dimColor={!isSelected} bold={isSelected}>
					{isSelected ? '┃  ' : '│  '}
				</Text>
				<Box paddingLeft={indent}>
					{/* Label only on the first content line for a message */}
					{item.isFirstLine
						? (
							<Text>
								<Text bold color={color}>
									{label}
									{item.type === 'tool' ? ': ' : item.isArgsLine ? ' args: ' : ': '}
								</Text>
								{item.type === 'tool' && item.toolName
									? (
										<Text>
											{item.text.startsWith(item.toolName)
												? (
													<>
														<Text color="white" bold>{item.toolName}</Text>
														<Text dimColor italic>{item.text.slice(item.toolName.length)}</Text>
													</>
												)
												: (
													<Text dimColor italic>
														{item.text.startsWith(' ') ? item.text : ` ${item.text}`}
													</Text>
												)}
										</Text>
									)
									: (
										<Text dimColor={!!item.isArgsLine} italic={!!item.isArgsLine}>
											{item.text}
										</Text>
									)}
							</Text>
						)
						: (
							<Text>
								{item.type === 'tool' && item.toolName
									? <Text dimColor italic>{item.text}</Text>
									: <Text dimColor={!!item.isArgsLine} italic={!!item.isArgsLine}>{item.text}</Text>}
							</Text>
						)}
				</Box>
			</Box>
		);
	},
);

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

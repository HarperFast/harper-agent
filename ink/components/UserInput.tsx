import { Spinner, TextInput } from '@inkjs/ui';
import { Box, Text } from 'ink';
import React, { useCallback, useState } from 'react';
import { footerHeight } from '../constants/footerHeight';
import { useChat } from '../contexts/ChatContext';
import { emitToListeners } from '../emitters/listener';
import type { UserInputMode } from '../models/userInputMode';

const modeSuggestion: Record<UserInputMode, string[]> = {
	approved: [],
	approving: ['yes', 'approve', 'no', 'deny'],
	denied: [],
	waiting: [],
	thinking: [],
};

export function UserInput() {
	const { userInputMode } = useChat();
	const [resetKey, setResetKey] = useState(0);

	const borderColor = calculateBorderColor(userInputMode);
	const placeholder = calculatePlaceholder(userInputMode);

	const onSubmitResetKey = useCallback((value: string) => {
		setResetKey(prev => prev + 1);
		emitToListeners('SetInputMode', 'thinking');
		emitToListeners('PushNewMessages', [{ type: 'user', text: value.trim() }]);
	}, []);

	return (
		<Box
			height={footerHeight}
			borderStyle="bold"
			borderColor={borderColor}
			flexDirection="row"
			alignItems="center"
			gap={1}
		>
			<Box marginLeft={1}>
				<Text bold color={borderColor === 'gray' ? 'white' : borderColor}>
					❯
				</Text>
			</Box>
			<TextInput
				key={resetKey}
				placeholder={placeholder}
				onSubmit={onSubmitResetKey}
				suggestions={modeSuggestion[userInputMode]}
			/>
			{userInputMode === 'thinking' && <Spinner type="clock" />}
		</Box>
	);
}

function calculateBorderColor(mode: UserInputMode) {
	switch (mode) {
		case 'approved':
			return 'green';
		case 'denied':
			return 'red';
		case 'approving':
			return 'yellow';
		case 'thinking':
			return 'blue';
		default:
		case 'waiting':
			return 'gray';
	}
}

function calculatePlaceholder(mode: UserInputMode) {
	const prefix = '  ';
	switch (mode) {
		case 'denied':
			return prefix + "OK! Let's find another way.";
		case 'approving':
			return prefix + 'Do you approve? yes / no';
		case 'thinking':
			return prefix + 'Thinking...';
		default:
		case 'approved':
		case 'waiting':
			return prefix + 'What shall we build today? (type "exit" or Ctrl+X to quit)';
	}
}

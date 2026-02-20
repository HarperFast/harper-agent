import { TextInput } from '@inkjs/ui';
import { Box, Text } from 'ink';
import React, { useCallback, useState } from 'react';
import { handleExit } from '../../lifecycle/handleExit';
import { footerHeight } from '../constants/footerHeight';
import { useChat } from '../contexts/ChatContext';
import { emitToListeners } from '../emitters/listener';
import type { UserInputMode } from '../models/userInputMode';

const modeSuggestion: Record<UserInputMode, string[]> = {
	approved: [],
	approving: ['yes', 'approve', 'no', 'deny'],
	denied: [],
	waiting: [],
};

export function UserInput() {
	const { userInputMode, focusedArea } = useChat();
	const [resetKey, setResetKey] = useState(0);
	const [, setBlankLines] = useState(0);

	const borderColor = focusedArea === 'input' ? 'blue' : 'gray';
	const placeholder = calculatePlaceholder(userInputMode);

	const onSubmitResetKey = useCallback((value: string) => {
		if (value.length) {
			setResetKey(prev => prev + 1);
			emitToListeners('PushNewMessages', [{ type: 'user', text: value.trim(), version: 1 }]);
			setBlankLines(0);
		} else {
			setBlankLines(value => {
				value += 1;
				if (value === 2) {
					void handleExit();
				}
				return value;
			});
		}
	}, []);

	return (
		<Box
			height={footerHeight}
			borderStyle="bold"
			borderTop={false}
			borderColor={borderColor}
			flexDirection="row"
			alignItems="center"
			gap={1}
		>
			<Box marginLeft={1}>
				<Text bold color={borderColor}>
					❯
				</Text>
			</Box>
			<TextInput
				key={resetKey}
				placeholder={placeholder}
				onSubmit={onSubmitResetKey}
				suggestions={modeSuggestion[userInputMode]}
				isDisabled={focusedArea !== 'input'}
			/>
		</Box>
	);
}

function calculatePlaceholder(mode: UserInputMode) {
	const prefix = '  ';
	switch (mode) {
		case 'denied':
			return prefix + "OK! Let's find another way.";
		case 'approving':
			return prefix + 'Do you approve? yes / no';
		default:
		case 'approved':
		case 'waiting':
			return prefix + 'What shall we build today? (type "exit" or Ctrl+X to quit)';
	}
}

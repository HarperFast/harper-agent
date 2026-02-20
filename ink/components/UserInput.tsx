import { Box, Text } from 'ink';
import React, { useCallback, useState } from 'react';
import { handleExit } from '../../lifecycle/handleExit';
import { footerHeight } from '../constants/footerHeight';
import { useChat } from '../contexts/ChatContext';
import { emitToListeners } from '../emitters/listener';
import type { UserInputMode } from '../models/userInputMode';
import { BlinkingTextInput } from './BlinkingTextInput';

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
			minHeight={footerHeight}
			borderStyle="bold"
			borderTop={false}
			borderColor={borderColor}
			flexDirection="row"
			alignItems="flex-start"
			gap={1}
		>
			<Box marginLeft={1} height={1}>
				<Text bold color={borderColor}>
					❯
				</Text>
			</Box>
			<Box flexGrow={1}>
				<BlinkingTextInput
					key={resetKey}
					placeholder={placeholder}
					onSubmit={onSubmitResetKey}
					suggestions={modeSuggestion[userInputMode]}
					isDisabled={focusedArea !== 'input'}
				/>
			</Box>
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
			return '';
	}
}

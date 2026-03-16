import { Box, Text } from 'ink';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import React, { useCallback, useState } from 'react';

const execAsync = promisify(exec);
import { handleExit } from '../../lifecycle/handleExit';
import { footerHeight } from '../constants/footerHeight';
import { useChat } from '../contexts/ChatContext';
import { emitToListeners, useListener } from '../emitters/listener';
import type { UserInputMode } from '../models/userInputMode';
import { BlinkingTextInput } from './BlinkingTextInput';

const modeSuggestion: Record<UserInputMode, string[]> = {
	approved: ['/clear', '/skills', '/exit'],
	approving: ['yes', 'approve', 'no', 'deny'],
	denied: [],
	waiting: ['/clear', '/skills', '/exit'],
};

export function UserInput() {
	const { userInputMode, focusedArea } = useChat();
	const [resetKey, setResetKey] = useState(0);
	const [, setBlankLines] = useState(0);

	useListener('ClearUserInput', () => {
		setResetKey(prev => prev + 1);
	}, []);

	const borderColor = focusedArea === 'input' ? 'cyan' : 'gray';
	const placeholder = calculatePlaceholder(userInputMode);

	const onSubmitResetKey = useCallback(async (value: string) => {
		if (value.length) {
			const trimmedValue = value.trim();

			if (trimmedValue === '/clear') {
				setResetKey(prev => prev + 1);
				emitToListeners('ClearChatHistory', undefined);
				return;
			}

			if (trimmedValue === '/exit' || trimmedValue === 'exit') {
				await handleExit();
				return;
			}

			if (trimmedValue === '/skills') {
				setResetKey(prev => prev + 1);
				emitToListeners('PushNewMessages', [{
					type: 'user',
					text: '/skills',
					version: 1,
				}, {
					type: 'agent',
					text: 'Installing skills...',
					version: 1,
				}]);
				try {
					const { stdout, stderr } = await execAsync('npx skills add harperfast/skills');
					emitToListeners(
						'UpdateLastMessageText',
						`\n\nSkills installation result:\n${stdout}${stderr ? `\nErrors:\n${stderr}` : ''}`,
					);
				} catch (error: any) {
					emitToListeners('UpdateLastMessageText', `\n\nFailed to install skills: ${error.message}`);
				}
				return;
			}

			setResetKey(prev => prev + 1);
			emitToListeners('PushNewMessages', [{ type: 'user', text: trimmedValue, version: 1 }]);
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

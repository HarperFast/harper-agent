import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';
import { agentManager } from '../../agent/AgentManager';
import { useListener } from '../emitters/listener';
import type { ChatContextType, FocusedArea } from '../models/ChatContextType';
import type { Message } from '../models/message';
import type { UserInputMode } from '../models/userInputMode';

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
	const context = useContext(ChatContext);
	if (!context) {
		throw new Error('useChat must be used within a ChatProvider');
	}
	return context;
};

let initialMessages: Message[] = [];

function getInitialMessages() {
	if (initialMessages.length === 0) {
		initialMessages = agentManager.initialMessages
			? agentManager.initialMessages.map((m, index) => ({
				...m,
				id: index,
				version: m.version ?? 1,
			}))
			: [{
				id: 0,
				type: 'agent',
				text: 'What shall we build today? (type "exit" or Ctrl+X to quit)',
				version: 1,
			}];
	}
	return initialMessages;
}

export const ChatProvider = ({
	children,
}: {
	children: ReactNode;
}) => {
	const [messages, setMessages] = useState<Message[]>(getInitialMessages());
	const [userInputMode, setUserInputMode] = useState<UserInputMode>('waiting');
	const [isThinking, setIsThinking] = useState<boolean>(false);
	const [focusedArea, setFocusedArea] = useState<FocusedArea>('input');

	useListener('PushNewMessages', (messages) => {
		setMessages(prev => {
			return prev.concat(
				messages.map((message, index) => ({ ...message, id: prev.length + index, version: 1 })),
			);
		});
	}, []);

	useListener('SetInputMode', newInputMode => {
		setUserInputMode(newInputMode);
	}, []);

	useListener('SetThinking', (value) => {
		setIsThinking(Boolean(value));
	}, []);

	useListener('InterruptThought', () => {
		setIsThinking(false);
	}, []);

	useListener('UpdateLastMessageText', (text) => {
		setMessages(prev => {
			if (prev.length === 0) {
				return prev;
			}
			const lastIndex = [...prev].reverse().findIndex(m => m.type === 'agent');
			if (lastIndex === -1) {
				return prev;
			}
			const actualIndex = prev.length - 1 - lastIndex;
			const last = prev[actualIndex]!;

			const updated = [...prev];
			updated[actualIndex] = {
				...last,
				text: last.text + text,
				version: last.version + 1,
			};
			return updated;
		});
	}, []);

	const value = useMemo(() => ({
		messages,
		userInputMode,
		isThinking,
		focusedArea,
		setFocusedArea,
	} satisfies ChatContextType), [messages, userInputMode, isThinking, focusedArea]);

	return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

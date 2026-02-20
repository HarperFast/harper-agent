import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';
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

let messageId = 0;

export const ChatProvider = ({
	children,
}: {
	children: ReactNode;
}) => {
	const [messages, setMessages] = useState<Message[]>([]);
	const [userInputMode, setUserInputMode] = useState<UserInputMode>('waiting');
	const [isThinking, setIsThinking] = useState<boolean>(false);
	const [focusedArea, setFocusedArea] = useState<FocusedArea>('input');

	useListener('PushNewMessages', (messages) => {
		setMessages(prev =>
			prev.concat(
				messages.map(message => ({ ...message, id: messageId++, version: 1 })),
			)
		);
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
			const last = prev[prev.length - 1];
			if (!last) {
				return prev;
			}
			const updated = [...prev];
			updated[prev.length - 1] = {
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

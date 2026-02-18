import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';
import { useListener } from '../emitters/listener';
import type { ChatContextType } from '../models/ChatContextType';
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

	useListener('PushNewMessages', (messages) => {
		setMessages(prev =>
			prev.concat(
				messages.map(message => ({ ...message, id: messageId++ })),
			)
		);
	}, []);

	useListener('SetInputMode', newInputMode => {
		setUserInputMode(newInputMode);
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
			};
			return updated;
		});
	}, []);

	const value = useMemo(() => ({
		messages,
		userInputMode,
	} satisfies ChatContextType), [messages, userInputMode]);

	return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

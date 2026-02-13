import type { Message } from './message';
import type { UserInputMode } from './userInputMode';

export interface ChatContextType {
	messages: Message[];
	userInputMode: UserInputMode;
}

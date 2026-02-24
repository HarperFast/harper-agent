import type { Message } from './message';
import type { UserInputMode } from './userInputMode';

export type FocusedArea = 'input' | 'timeline' | 'status';

export interface ChatContextType {
	messages: Message[];
	userInputMode: UserInputMode;
	isThinking: boolean;
	isCompacting: boolean;
	focusedArea: FocusedArea;
	setFocusedArea: (area: FocusedArea) => void;
}

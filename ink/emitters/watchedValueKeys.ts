import type { ActionItem } from '../models/actionItem';
import type { Message } from '../models/message';
import type { PlanItem } from '../models/planItem';
import type { ShellCommand } from '../models/shellCommand';
import type { UserInputMode } from '../models/userInputMode';

export interface WatchedValuesTypeMap {
	PushNewMessages: Omit<Message, 'id'>[];
	SetGoal: string;
	SetInputMode: UserInputMode;
	SetThinking: boolean;
	SetPlanItems: PlanItem[];
	AddShellCommand: Omit<ShellCommand, 'id'>;
	UpdateShellCommand: Partial<ShellCommand> & { id: number };
	AddActionItem: Omit<ActionItem, 'id'> & { id?: number };
	UpdateActionItem: Partial<ActionItem> & { id: number };
	ExitUI: undefined;
	InterruptThought: undefined;
	UpdateLastMessageText: string;
	UpdateCost: {
		totalCost: number;
		inputTokens: number;
		outputTokens: number;
		cachedInputTokens: number;
		hasUnknownPrices: boolean;
	};
}

export type WatchedValueKeys = keyof WatchedValuesTypeMap;

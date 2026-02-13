import type { Message } from '../models/message';
import type { PlanItem } from '../models/planItem';
import type { ShellCommand } from '../models/shellCommand';
import type { UserInputMode } from '../models/userInputMode';

export interface WatchedValuesTypeMap {
	PushNewMessages: Omit<Message, 'id'>[];
	SetGoal: string;
	SetInputMode: UserInputMode;
	SetPlanItems: PlanItem[];
	AddShellCommand: Omit<ShellCommand, 'id'>;
	UpdateShellCommand: Partial<ShellCommand> & { id: number };
	Exit: undefined;
	InterruptThought: undefined;
	UpdateLastMessageText: string;
}

export type WatchedValueKeys = keyof WatchedValuesTypeMap;

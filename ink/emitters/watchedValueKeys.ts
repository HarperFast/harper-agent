import type { ApprovalPayload } from '../contexts/ApprovalPayload';
import type { ActionItem } from '../models/actionItem';
import type { Message } from '../models/message';
import type { PlanItem } from '../models/planItem';
import type { ShellCommand } from '../models/shellCommand';
import type { UserInputMode } from '../models/userInputMode';

export interface WatchedValuesTypeMap {
	PushNewMessages: Omit<Message, 'id'>[];
	SetPlanDescription: string;
	SetInputMode: UserInputMode;
	SetThinking: boolean;
	SetCompacting: boolean;
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
	OpenApprovalViewer: ApprovalPayload;
	CloseApprovalViewer: undefined;
	ClearUserInput: undefined;
	ApproveCurrentApproval: undefined;
	DenyCurrentApproval: undefined;
	RegisterToolInfo: ApprovalPayload & { callId: string };
	SettingsUpdated: undefined;
}

export type WatchedValueKeys = keyof WatchedValuesTypeMap;

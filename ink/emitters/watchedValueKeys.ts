import type { ApprovalPayload } from '../contexts/ApprovalPayload';
import type { CostData } from '../contexts/CostData';
import type { ActionItem } from '../models/actionItem';
import type { Message } from '../models/message';
import type { PlanItem } from '../models/planItem';
import type { PullingState } from '../models/pullingState';
import type { UserInputMode } from '../models/userInputMode';

export interface WatchedValuesTypeMap {
	// Planning
	SetPlanDescription: string;
	SetPlanItems: PlanItem[];
	// Actions
	AddActionItem: Omit<ActionItem, 'id'> & { id?: number };
	UpdateActionItem: Partial<ActionItem> & { id: number };
	// Approvals
	ApproveCurrentApproval: undefined;
	CloseApprovalViewer: undefined;
	DenyCurrentApproval: undefined;
	OpenApprovalViewer: ApprovalPayload;
	// History
	ClearChatHistory: undefined;
	PushNewMessages: Omit<Message, 'id'>[];
	UpdateLastMessageText: string;
	// User input
	ClearUserInput: undefined;
	InterruptThought: undefined;
	SetInputMode: UserInputMode;
	// State
	ExitUI: undefined;
	SetCompacting: boolean;
	SetPulling: PullingState | null;
	SetThinking: boolean;
	SettingsUpdated: undefined;
	UpdateCost: CostData;
}

export type WatchedValueKeys = keyof WatchedValuesTypeMap;

export type ActionKind = 'shell' | 'approval' | 'apply_patch' | 'create_app' | 'tool' | 'other';

export interface ActionItem {
	id: number;
	kind: ActionKind;
	title: string; // primary label, e.g., command or tool name
	detail: string; // arguments or short description
	running: boolean;
	exitCode?: number; // for shell or numeric statuses where relevant
	status?: 'approved' | 'denied' | 'succeeded' | 'failed' | 'pending';
}

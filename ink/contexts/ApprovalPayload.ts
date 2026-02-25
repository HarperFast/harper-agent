export interface ApprovalPayload {
	type: 'create_file' | 'update_file' | 'delete_file' | 'overwrite_file' | 'code_interpreter' | 'shell' | 'apply_patch';
	path?: string | undefined;
	diff?: string | undefined;
	code?: string | undefined;
	commands?: string[] | undefined;
	mode?: 'ask' | 'info' | undefined;
	callId?: string | undefined;
	actionId?: number | undefined;
	openedAt?: number | undefined;
}

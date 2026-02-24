export interface Message {
	id: number;
	version: number;
	type: 'prompt' | 'user' | 'agent' | 'tool' | 'interrupted';
	handled?: boolean;
	text: string;
	args?: string;
	callId?: string;
}

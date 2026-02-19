export interface Message {
	id: number;
	version: number;
	type: 'user' | 'agent' | 'tool' | 'interrupted';
	handled?: boolean;
	text: string;
	args?: string;
}

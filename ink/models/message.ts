export interface Message {
	id: number;
	type: 'user' | 'agent' | 'tool' | 'interrupted';
	text: string;
	args?: string;
}

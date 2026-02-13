export interface ShellCommand {
	id: number;
	command: string;
	args: string;
	running: boolean;
	exitCode?: number;
}

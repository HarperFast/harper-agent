import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';
import { useListener } from '../emitters/listener';
import type { ShellCommand } from '../models/shellCommand';
import type { ShellContextType } from '../models/ShellContextType';

const ShellContext = createContext<ShellContextType | undefined>(undefined);

export const useShell = () => {
	const context = useContext(ShellContext);
	if (!context) {
		throw new Error('useShell must be used within a ShellProvider');
	}
	return context;
};

export let commandId = 0;

export const ShellProvider = ({
	children,
}: {
	children: ReactNode;
}) => {
	const [commands, setCommands] = useState<ShellCommand[]>([]);

	useListener('AddShellCommand', (command) => {
		setCommands(prev => [...prev, { ...command, id: commandId++ }]);
	}, []);

	useListener('UpdateShellCommand', (updatedCommand) => {
		setCommands(prev =>
			prev.map(cmd =>
				cmd.id === updatedCommand.id
					? { ...cmd, ...updatedCommand }
					: cmd
			)
		);
	}, []);

	const value = useMemo(() => ({
		commands,
	}), [commands]);

	return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
};

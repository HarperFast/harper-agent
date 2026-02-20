import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { agentManager } from '../../agent/AgentManager';
import { emitToListeners, useListener } from '../emitters/listener';
import type { ActionItem } from '../models/actionItem';
import type { ActionsContextType } from '../models/ActionsContextType';

const ActionsContext = createContext<ActionsContextType | undefined>(undefined);

export const useActions = () => {
	const context = useContext(ActionsContext);
	if (!context) {
		throw new Error('useActions must be used within an ActionsProvider');
	}
	return context;
};

export let actionId = 0;

export const ActionsProvider = ({ children }: { children: ReactNode }) => {
	const [actions, setActions] = useState<ActionItem[]>([]);

	useListener('AddActionItem', (action: Omit<ActionItem, 'id'> & { id?: number }) => {
		setActions(prev => {
			const assignedId = action.id ?? actionId++;
			return [...prev, { ...action, id: assignedId } as ActionItem];
		});
	}, []);

	useListener('UpdateActionItem', (updated: Partial<ActionItem> & { id: number }) => {
		setActions(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a));
	}, []);

	// Seed from initial messages (best-effort): add tool calls as generic actions
	useEffect(() => {
		if (agentManager?.initialMessages?.length) {
			for (const m of agentManager.initialMessages) {
				if (m.type === 'tool') {
					emitToListeners('AddActionItem', {
						kind: 'tool',
						title: m.text,
						detail: m.args ?? '',
						running: false,
					});
				}
			}
		}
		// run once
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const value = useMemo(() => ({ actions }) satisfies ActionsContextType, [actions]);
	return <ActionsContext.Provider value={value}>{children}</ActionsContext.Provider>;
};

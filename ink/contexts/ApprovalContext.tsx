import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { useListener } from '../emitters/listener';
import type { ApprovalPayload } from './ApprovalPayload';

interface ApprovalContextType {
	payload: ApprovalPayload | null;
	setPayload: (payload: ApprovalPayload | null) => void;
	registerToolInfo: (info: ApprovalPayload & { callId: string }) => void;
}

const ApprovalContext = createContext<ApprovalContextType | undefined>(undefined);

export const useApproval = () => {
	const context = useContext(ApprovalContext);
	if (!context) {
		throw new Error('useApproval must be used within an ApprovalProvider');
	}
	return context;
};

export const ApprovalProvider = ({ children }: { children: ReactNode }) => {
	const [payload, setPayload] = useState<ApprovalPayload | null>(null);
	const [toolInfos] = useState(new Map<string, ApprovalPayload & { callId: string }>());

	const registerToolInfo = useCallback(
		(info: ApprovalPayload & { callId: string }) => {
			toolInfos.set(info.callId, info);
		},
		[toolInfos],
	);

	useListener('OpenApprovalViewer', (p) => {
		let finalPayload: ApprovalPayload = { ...p, openedAt: Date.now() };
		if (p.mode === 'info' && p.callId) {
			const info = toolInfos.get(p.callId);
			if (info) {
				finalPayload = { ...finalPayload, ...info };
			}
		} else if (p.callId) {
			// Also register if it's an ask mode call, so we can re-view it later
			registerToolInfo({
				callId: p.callId!,
				type: p.type,
				path: p.path,
				diff: p.diff,
				code: p.code,
				commands: p.commands,
			});
		}
		setPayload(finalPayload);
	}, [registerToolInfo, toolInfos]);

	useListener('CloseApprovalViewer', () => {
		setPayload(null);
	}, []);

	const value = useMemo(() => ({
		payload,
		setPayload,
		registerToolInfo,
	}), [payload, registerToolInfo]);

	return <ApprovalContext.Provider value={value}>{children}</ApprovalContext.Provider>;
};

import { render, useApp } from 'ink';
import React from 'react';
import { parseArgs } from '../lifecycle/parseArgs.js';
import { ChatContent } from './components/ChatContent';
import { DiffApprovalView } from './components/DiffApprovalView';
import { ConfigurationWizard } from './configurationWizard/ConfigurationWizard';
import { ActionsProvider } from './contexts/ActionsContext';
import { ApprovalProvider } from './contexts/ApprovalContext';
import { ChatProvider } from './contexts/ChatContext';
import { CostProvider } from './contexts/CostContext';
import { PlanProvider } from './contexts/PlanContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { useListener } from './emitters/listener';

export function bootstrapConfig() {
	return new Promise(resolve => {
		render(<MainConfig onComplete={resolve} />);
	});
}

export async function showConfigThenReparse() {
	await bootstrapConfig();
	parseArgs();
	bootstrapMain();
}

export function MainConfig({ onComplete }: { onComplete: (value?: unknown) => void }) {
	const { exit } = useApp();
	useListener('ExitUI', () => exit(), [exit]);
	return <ConfigurationWizard onComplete={onComplete} />;
}

export function bootstrapMain() {
	render(<MainChat />);
}

function MainChat() {
	const { exit } = useApp();
	useListener('ExitUI', () => exit(), [exit]);
	return (
		<CostProvider>
			<PlanProvider>
				<ActionsProvider>
					<ApprovalProvider>
						<SettingsProvider>
							<ChatProvider>
								<ChatContent />
								<DiffApprovalView />
							</ChatProvider>
						</SettingsProvider>
					</ApprovalProvider>
				</ActionsProvider>
			</PlanProvider>
		</CostProvider>
	);
}

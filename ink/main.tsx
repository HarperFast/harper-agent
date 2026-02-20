import { render, useApp } from 'ink';
import React from 'react';
import { ChatContent } from './components/ChatContent';
import { ConfigurationWizard } from './configurationWizard/ConfigurationWizard';
import { ActionsProvider } from './contexts/ActionsContext';
import { ChatProvider } from './contexts/ChatContext';
import { CostProvider } from './contexts/CostContext';
import { PlanProvider } from './contexts/PlanContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { useListener } from './emitters/listener';

export function bootstrapConfig(onComplete: (value?: unknown) => void) {
	render(<MainConfig onComplete={onComplete} />);
}

function MainConfig({ onComplete }: { onComplete: (value?: unknown) => void }) {
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
					<SettingsProvider>
						<ChatProvider>
							<ChatContent />
						</ChatProvider>
					</SettingsProvider>
				</ActionsProvider>
			</PlanProvider>
		</CostProvider>
	);
}

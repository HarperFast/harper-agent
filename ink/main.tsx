import { render, useApp } from 'ink';
import React, { useState } from 'react';
import { ChatContent } from './components/ChatContent';
import { ConfigurationWizard } from './components/ConfigurationWizard';
import { ChatProvider } from './contexts/ChatContext';
import { PlanProvider } from './contexts/PlanContext';
import { ShellProvider } from './contexts/ShellContext';
import { useListener } from './emitters/listener';
import type { Config } from './models/config';

function Main() {
	const { exit } = useApp();
	useListener('Exit', () => exit(), [exit]);
	const [config, setConfig] = useState<Config | null>(null);

	return (
		<PlanProvider>
			<ShellProvider>
				<ChatProvider>
					{!config ? <ConfigurationWizard onComplete={setConfig} /> : <ChatContent />}
				</ChatProvider>
			</ShellProvider>
		</PlanProvider>
	);
}

render(<Main />);

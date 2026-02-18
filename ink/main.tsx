import { render, useApp } from 'ink';
import React, { useEffect, useState } from 'react';
import { agentManager } from '../agent/AgentManager';
import { getProvider } from '../lifecycle/getModel';
import { trackedState } from '../lifecycle/trackedState';
import { ChatContent } from './components/ChatContent';
import { ConfigurationWizard } from './components/ConfigurationWizard';
import { ChatProvider } from './contexts/ChatContext';
import { CostProvider } from './contexts/CostContext';
import { PlanProvider } from './contexts/PlanContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { ShellProvider } from './contexts/ShellContext';
import { useListener } from './emitters/listener';
import type { Config, ModelProvider } from './models/config';

function Main() {
	const { exit } = useApp();
	useListener('Exit', () => exit(), [exit]);
	const [config, setConfig] = useState<Config | null>(() => {
		const model = trackedState.model;
		const compactionModel = trackedState.compactionModel;
		const provider = (process.env.HARPER_AGENT_PROVIDER || getProvider(model)) as ModelProvider;

		let apiKey: string | undefined;
		if (provider === 'OpenAI') { apiKey = process.env.OPENAI_API_KEY; }
		else if (provider === 'Anthropic') { apiKey = process.env.ANTHROPIC_API_KEY; }
		else if (provider === 'Google') { apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY; }

		if (apiKey || provider === 'Ollama') {
			return { provider, model, compactionModel, apiKey };
		}
		return null;
	});

	useEffect(() => {
		if (config) {
			void agentManager.initialize(config);
		}
	}, [config]);

	return (
		<CostProvider>
			<PlanProvider>
				<ShellProvider>
					<SettingsProvider>
						<ChatProvider>
							{!config ? <ConfigurationWizard onComplete={setConfig} /> : <ChatContent />}
						</ChatProvider>
					</SettingsProvider>
				</ShellProvider>
			</PlanProvider>
		</CostProvider>
	);
}

export function bootstrap() {
	render(<Main />);
}

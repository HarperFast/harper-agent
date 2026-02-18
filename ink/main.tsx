import { render, useApp } from 'ink';
import React, { useEffect, useState } from 'react';
import { agentManager } from '../agent/AgentManager';
import { ChatContent } from './components/ChatContent';
import { ConfigurationWizard } from './components/ConfigurationWizard';
import { ChatProvider } from './contexts/ChatContext';
import { PlanProvider } from './contexts/PlanContext';
import { ShellProvider } from './contexts/ShellContext';
import { useListener } from './emitters/listener';
import type { Config, ModelProvider } from './models/config';

function Main() {
	const { exit } = useApp();
	useListener('Exit', () => exit(), [exit]);
	const [config, setConfig] = useState<Config | null>(() => {
		const provider = (process.env.HARPER_AGENT_PROVIDER || 'OpenAI') as ModelProvider;
		const model = process.env.HARPER_AGENT_MODEL || 'gpt-4o';
		const compactionModel = process.env.HARPER_AGENT_COMPACTION_MODEL || 'gpt-4o-mini';
		const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY
			|| process.env.GOOGLE_GENERATIVE_AI_API_KEY;

		if (apiKey || provider === 'Ollama') {
			return { provider, model, compactionModel, apiKey };
		}
		return null;
	});

	useEffect(() => {
		if (config) {
			agentManager.initialize(config);
		}
	}, [config]);

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

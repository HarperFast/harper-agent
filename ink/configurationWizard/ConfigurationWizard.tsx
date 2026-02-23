import { Box, useInput } from 'ink';
import { Step, Stepper } from 'ink-stepper';
import React, { useState } from 'react';
import { updateEnv } from '../../utils/files/updateEnv';
import { updateEnvKeyForProvider } from '../../utils/files/updateEnvKeyForProvider';
import { curryEmitToListeners, emitToListeners } from '../emitters/listener';
import type { ModelProvider } from '../models/config';
import { ApiKeyStep } from './ApiKeyStep';
import { ApiUrlStep } from './ApiUrlStep';
import { EnvironmentSettingsStep } from './EnvironmentSettingsStep';
import { compactorModelsByProvider, modelsByProvider } from './modelsByProvider';
import { ModelSelectionStep } from './ModelSelectionStep';
import { ProviderStep } from './ProviderStep';
import { StepperProgress } from './StepperProgress';

interface Props {
	onComplete: () => void;
}

export function ConfigurationWizard({ onComplete }: Props) {
	const [provider, setProvider] = useState<ModelProvider>('OpenAI');

	useInput((input, key) => {
		if (key.ctrl && input === 'x') {
			emitToListeners('ExitUI', undefined);
		}
	});

	const models = modelsByProvider[provider];
	const compactorModels = compactorModelsByProvider[provider];

	return (
		<Box flexDirection="column" padding={1} minHeight={10}>
			<Stepper
				onComplete={onComplete}
				onCancel={curryEmitToListeners('ExitUI', undefined)}
				keyboardNav={true}
				renderProgress={StepperProgress}
			>
				<Step name="AI Provider">
					{({ goNext }) => (
						<ProviderStep
							onConfirm={(p) => {
								setProvider(p);
								goNext();
							}}
						/>
					)}
				</Step>

				<Step name={provider !== 'Ollama' ? 'API Key' : 'API'}>
					{({ goNext, goBack }) => (provider !== 'Ollama'
						? (
							<ApiKeyStep
								provider={provider}
								onConfirm={(key) => {
									updateEnvKeyForProvider(provider, key);
									goNext();
								}}
								onBack={goBack}
							/>
						)
						: (
							<ApiUrlStep
								provider={provider}
								onConfirm={(key) => {
									updateEnvKeyForProvider(provider, key);
									goNext();
								}}
								onBack={goBack}
							/>
						))}
				</Step>

				<Step name="Model">
					{({ goNext, goBack }) => (
						<ModelSelectionStep
							title="What model would you like to use?"
							models={models}
							onConfirm={(m) => {
								updateEnv('HARPER_AGENT_MODEL', m);
								goNext();
							}}
							onBack={goBack}
						/>
					)}
				</Step>

				<Step name="Compactor">
					{({ goNext, goBack }) => (
						<ModelSelectionStep
							title="What model should we use for memory compaction?"
							models={compactorModels}
							onConfirm={(m) => {
								updateEnv('HARPER_AGENT_COMPACTION_MODEL', m);
								goNext();
							}}
							onBack={goBack}
						/>
					)}
				</Step>

				<Step name="Settings">
					{({ goNext, goBack }) => (
						<EnvironmentSettingsStep
							onConfirm={() => {
								goNext();
							}}
							onBack={goBack}
						/>
					)}
				</Step>
			</Stepper>
		</Box>
	);
}

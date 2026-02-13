import { PasswordInput, Select, TextInput } from '@inkjs/ui';
import { Box, Text, useInput } from 'ink';
import { type ProgressContext, Step, Stepper, type StepperMarkers, useStepperInput } from 'ink-stepper';
import React, { Fragment, useEffect, useState } from 'react';
import { emitToListeners } from '../emitters/listener';
import type { Config, ModelProvider } from '../models/config';

const providers: { label: string; value: ModelProvider }[] = [
	{ label: 'OpenAI', value: 'OpenAI' },
	{ label: 'Anthropic', value: 'Anthropic' },
	{ label: 'Google', value: 'Google' },
	{ label: 'Ollama', value: 'Ollama' },
];

const modelsByProvider: Record<ModelProvider, string[]> = {
	OpenAI: ['gpt-5.2', 'gpt-5.0', 'gpt-4o-mini'],
	Anthropic: ['claude-4-6-opus-latest', 'claude-4-5-sonnet-latest', 'claude-4-5-haiku-latest'],
	Google: ['gemini-3-pro', 'gemini-3-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'],
	Ollama: ['qwen3-coder:30b', 'mistral', 'codellama'],
};

const compactorModelsByProvider: Record<ModelProvider, string[]> = {
	OpenAI: modelsByProvider.OpenAI.slice().reverse(),
	Anthropic: modelsByProvider.Anthropic.slice().reverse(),
	Google: modelsByProvider.Google.slice().reverse(),
	Ollama: modelsByProvider.Ollama.slice(),
};

interface Props {
	onComplete: (config: Config) => void;
}

function ProviderStep({ onConfirm }: { onConfirm: (provider: ModelProvider) => void }) {
	const { disableNavigation, enableNavigation } = useStepperInput();

	useEffect(() => {
		disableNavigation();
		return () => enableNavigation();
	}, [disableNavigation, enableNavigation]);

	return (
		<Box flexDirection="column">
			<Text>What model provider would you like to use today?</Text>
			<Select
				options={providers}
				onChange={(v) => onConfirm(v as ModelProvider)}
			/>
		</Box>
	);
}

function ApiKeyStep(
	{ provider, onConfirm, onBack }: { provider: ModelProvider; onConfirm: (key: string) => void; onBack: () => void },
) {
	const { disableNavigation, enableNavigation } = useStepperInput();

	useEffect(() => {
		disableNavigation();
		return () => enableNavigation();
	}, [disableNavigation, enableNavigation]);

	useInput((input, key) => {
		if (key.escape) {
			onBack();
		}
	});

	const instructions: Record<string, string> = {
		OpenAI: 'Get your key at: https://platform.openai.com/api-keys',
		Anthropic: 'Get your key at: https://console.anthropic.com/settings/keys',
		Google: 'Get your key at: https://aistudio.google.com/app/apikey',
		Ollama: '',
	};

	return (
		<Box flexDirection="column">
			<Text>Can you provide us with your {provider} API key?</Text>
			<Text dimColor>{instructions[provider]}</Text>
			<Box marginTop={1}>
				<PasswordInput
					onSubmit={(v) => {
						if (v === 'exit') {
							emitToListeners('Exit', undefined);
						} else {
							onConfirm(v);
						}
					}}
				/>
			</Box>
			<Box marginTop={1}>
				<Text dimColor>Press ESC to go back</Text>
			</Box>
		</Box>
	);
}

function ApiUrlStep(
	{ provider, onConfirm, onBack }: { provider: ModelProvider; onConfirm: (key: string) => void; onBack: () => void },
) {
	const { disableNavigation, enableNavigation } = useStepperInput();

	useEffect(() => {
		disableNavigation();
		return () => enableNavigation();
	}, [disableNavigation, enableNavigation]);

	useInput((input, key) => {
		if (key.escape) {
			onBack();
		}
	});

	const defaultApi: Record<string, string> = {
		OpenAI: '',
		Anthropic: '',
		Google: '',
		Ollama: 'http://localhost:11434/api',
	};

	return (
		<Box flexDirection="column">
			<Text>Where are you hosting {provider}?</Text>
			<Box marginTop={1}>
				<TextInput
					placeholder={defaultApi[provider] || ''}
					onSubmit={(v) => {
						if (v === 'exit') {
							emitToListeners('Exit', undefined);
						} else {
							onConfirm(v || defaultApi[provider] || '');
						}
					}}
				/>
			</Box>
			<Box marginTop={1}>
				<Text dimColor>Press ESC to go back</Text>
			</Box>
		</Box>
	);
}

function ModelSelectionStep({
	title,
	models,
	onConfirm,
	onBack,
}: {
	title: string;
	models: string[];
	onConfirm: (model: string) => void;
	onBack: () => void;
}) {
	const { disableNavigation, enableNavigation } = useStepperInput();
	const [isCustom, setIsCustom] = useState(false);

	useEffect(() => {
		disableNavigation();
		return () => enableNavigation();
	}, [isCustom, disableNavigation, enableNavigation]);

	useInput((input, key) => {
		if (key.escape) {
			if (isCustom) {
				setIsCustom(false);
			} else {
				onBack();
			}
		}
	});

	if (isCustom) {
		return (
			<Box flexDirection="column">
				<Text>Enter custom model name for: {title}</Text>
				<TextInput
					onSubmit={(v) => {
						if (v === 'exit') {
							emitToListeners('Exit', undefined);
						} else {
							onConfirm(v);
						}
					}}
				/>
				<Box marginTop={1}>
					<Text dimColor>Press ESC to go back to list</Text>
				</Box>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Text>{title}</Text>
			<Select
				options={[
					...models.map(m => ({ label: m, value: m })),
					{ label: 'Other...', value: 'other' },
				]}
				onChange={(v) => {
					if (v === 'other') {
						setIsCustom(true);
					} else {
						onConfirm(v);
					}
				}}
			/>
			<Box marginTop={1}>
				<Text dimColor>Press ESC to go back</Text>
			</Box>
		</Box>
	);
}

const markers: Required<StepperMarkers> = {
	completed: ' ✓ ',
	current: ' ● ',
	pending: ' ○ ',
};

const SEGMENT_WIDTH = 12;

export function StepperProgress({ steps, currentStep }: ProgressContext): React.JSX.Element {
	return (
		<Box flexDirection="column" marginBottom={1}>
			<Box>
				{steps.map((step, idx) => {
					return (
						<Box key={step.name} width={SEGMENT_WIDTH} justifyContent="center">
							<Text
								color={step.completed ? 'green' : step.current ? 'cyan' : 'gray'}
								bold={step.current}
								dimColor={!step.completed && !step.current}
							>
								{step.name}
							</Text>
						</Box>
					);
				})}
			</Box>

			<Box>
				{steps.map((step, idx) => {
					const marker = step.completed ? markers.completed : step.current ? markers.current : markers.pending;

					const beforeLineColor = step.completed || idx <= currentStep ? 'green' : 'gray';
					const afterLineColor = step.completed ? 'green' : 'gray';
					const markerColor = step.completed ? 'green' : step.current ? 'cyan' : 'gray';

					return (
						<Fragment key={step.name}>
							{/* Leading segment (except for first step) */}
							<Text color={beforeLineColor}>{'━'.repeat(SEGMENT_WIDTH / 2 - 2)}</Text>
							{/* Marker */}
							<Text color={markerColor} bold={step.current}>
								{marker}
							</Text>
							<Text color={afterLineColor}>{'━'.repeat(SEGMENT_WIDTH / 2 - 1)}</Text>
						</Fragment>
					);
				})}
			</Box>
		</Box>
	);
}

export function ConfigurationWizard({ onComplete }: Props) {
	const [provider, setProvider] = useState<ModelProvider>('OpenAI');
	const [apiKey, setApiKey] = useState('');
	const [model, setModel] = useState('');
	const [compactionModel, setCompactionModel] = useState('');

	useInput((input, key) => {
		if (key.ctrl && input === 'x') {
			emitToListeners('Exit', undefined);
		}
	});

	const models = modelsByProvider[provider];
	const compactorModels = compactorModelsByProvider[provider];

	return (
		<Box flexDirection="column" padding={1} minHeight={10}>
			<Stepper
				onComplete={() => onComplete({ provider, apiKey, model, compactionModel })}
				onCancel={() => emitToListeners('Exit', undefined)}
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
									setApiKey(key);
									goNext();
								}}
								onBack={goBack}
							/>
						)
						: (
							<ApiUrlStep
								provider={provider}
								onConfirm={(key) => {
									setApiKey(key);
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
								setModel(m);
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
								setCompactionModel(m);
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

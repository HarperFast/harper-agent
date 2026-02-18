import { PasswordInput } from '@inkjs/ui';
import { Box, Text, useInput } from 'ink';
import { useStepperInput } from 'ink-stepper';
import React, { useEffect } from 'react';
import { emitToListeners } from '../emitters/listener';
import type { ModelProvider } from '../models/config';

export function ApiKeyStep(
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
							emitToListeners('ExitUI', undefined);
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

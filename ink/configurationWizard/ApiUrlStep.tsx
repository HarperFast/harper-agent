import { Box, Text, useInput } from 'ink';
import { useStepperInput } from 'ink-stepper';
import React, { useEffect } from 'react';
import { BlinkingTextInput } from '../components/BlinkingTextInput';
import { emitToListeners } from '../emitters/listener';
import type { ModelProvider } from '../models/config';

export function ApiUrlStep(
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
				<BlinkingTextInput
					placeholder={defaultApi[provider] || ''}
					onSubmit={(v) => {
						if (v === 'exit') {
							emitToListeners('ExitUI', undefined);
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

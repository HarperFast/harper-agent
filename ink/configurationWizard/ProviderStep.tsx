import { Select } from '@inkjs/ui';
import { Box, Text } from 'ink';
import { useStepperInput } from 'ink-stepper';
import React, { useEffect } from 'react';
import type { ModelProvider } from '../models/config';
import { providers } from './providers';

export function ProviderStep({ onConfirm }: { onConfirm: (provider: ModelProvider) => void }) {
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

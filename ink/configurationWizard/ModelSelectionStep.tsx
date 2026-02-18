import { Select, TextInput } from '@inkjs/ui';
import { Box, Text, useInput } from 'ink';
import { useStepperInput } from 'ink-stepper';
import React, { useEffect, useState } from 'react';
import { emitToListeners } from '../emitters/listener';

export function ModelSelectionStep({
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
							emitToListeners('ExitUI', undefined);
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

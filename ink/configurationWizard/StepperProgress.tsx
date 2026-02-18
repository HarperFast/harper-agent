import { Box, Text } from 'ink';
import type { ProgressContext, StepperMarkers } from 'ink-stepper';
import React, { Fragment } from 'react';

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
				{steps.map((step) => {
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

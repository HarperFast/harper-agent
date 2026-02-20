import { ProgressBar } from '@inkjs/ui';
import { Box, Text } from 'ink';
import React from 'react';
import { usePlan } from '../contexts/PlanContext';

export function PlanView() {
	const { planDescription, planItems, progress } = usePlan();

	return (
		<Box flexDirection="column" flexGrow={1}>
			<Box flexDirection="column" marginBottom={1}>
				<Text italic>{planDescription}</Text>
			</Box>

			<Box flexDirection="column" flexGrow={1}>
				{planItems.map(planItem => (
					<Box key={planItem.id}>
						<Text color={planItem.completed ? 'green' : 'white'}>
							{planItem.completed ? ' ● ' : ' ○ '}
							{planItem.text}
						</Text>
					</Box>
				))}
			</Box>

			<Box flexDirection="column" marginTop={1}>
				<Text bold>PROGRESS: {progress}%</Text>
				<ProgressBar value={progress} />
			</Box>
		</Box>
	);
}

import { Box, Text } from 'ink';
import React from 'react';
import { useCost } from '../contexts/CostContext';

export function CostView() {
	const { cost } = useCost();

	return (
		<Box flexDirection="column" paddingLeft={1} paddingTop={1}>
			<Box marginBottom={1}>
				<Text bold underline color="cyan">Session Cost Breakdown</Text>
			</Box>

			<Box>
				<Box width={20}>
					<Text>Total Cost:</Text>
				</Box>
				<Text color="green">${cost.totalCost.toFixed(4)}</Text>
				{cost.hasUnknownPrices && <Text color="yellow">(estimated - some prices unknown)</Text>}
			</Box>

			<Box>
				<Box width={20}>
					<Text>Input Tokens:</Text>
				</Box>
				<Text>{cost.inputTokens.toLocaleString()}</Text>
			</Box>

			<Box>
				<Box width={20}>
					<Text>Cached Tokens:</Text>
				</Box>
				<Text color="gray">{cost.cachedInputTokens.toLocaleString()}</Text>
			</Box>

			<Box>
				<Box width={20}>
					<Text>Output Tokens:</Text>
				</Box>
				<Text>{cost.outputTokens.toLocaleString()}</Text>
			</Box>
		</Box>
	);
}

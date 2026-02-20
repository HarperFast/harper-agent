import { Box, Text } from 'ink';
import React from 'react';
import { useCost } from '../contexts/CostContext';

export function CostView({ isDense = false }: { isDense?: boolean }) {
	const { cost } = useCost();

	return (
		<Box flexDirection="column" paddingLeft={1} paddingTop={isDense ? 0 : 1}>
			<Box marginBottom={isDense ? 0 : 1}>
				<Text bold underline color="cyan">Session Cost Breakdown</Text>
			</Box>

			<Box>
				<Box width={20}>
					<Text>Total Cost:</Text>
				</Box>
				<Text color="green">${cost.totalCost.toFixed(4)}</Text>
				{cost.hasUnknownPrices && <Text color="yellow">(est.)</Text>}
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

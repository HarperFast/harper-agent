import { Spinner } from '@inkjs/ui';
import { Box, Text } from 'ink';
import React, { memo } from 'react';
import type { ShellCommand } from '../models/shellCommand';

export const ShellCommandItem = memo(({ command, isSelected }: { command: ShellCommand; isSelected: boolean }) => {
	const statusColor = command.running ? 'yellow' : command.exitCode === 0 ? 'green' : 'red';
	const pipe = (
		<Text color={isSelected ? 'blue' : 'gray'} dimColor={!isSelected} bold={isSelected}>
			{isSelected ? '┃  ' : '│  '}
		</Text>
	);

	return (
		<Box flexDirection="column">
			<Box>
				{pipe}
				<Box gap={1}>
					<Text bold color={statusColor}>
						[{command.running ? '' : command.exitCode === 0 ? '✅' : `${command.exitCode}`}]
					</Text>
					<Text color="white" bold wrap="truncate-end">
						{command.command}
					</Text>
				</Box>
				{command.running && <Spinner type="dots" />}
			</Box>
			<Box>
				{pipe}
				<Box paddingLeft={2}>
					<Text dimColor italic wrap="truncate-end">
						{command.args}
					</Text>
				</Box>
			</Box>
		</Box>
	);
});

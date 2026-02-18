import { Spinner } from '@inkjs/ui';
import { Box, Text } from 'ink';
import React, { memo } from 'react';
import type { ShellCommand } from '../models/shellCommand';

export const ShellCommandItem = memo(({ command, isSelected }: { command: ShellCommand; isSelected: boolean }) => {
	const statusColor = command.running ? 'yellow' : command.exitCode === 0 ? 'green' : 'red';

	return (
		<Box flexDirection="column" paddingLeft={isSelected ? 0 : 2}>
			<Box gap={1}>
				{isSelected && (
					<Text color="gray" bold>
						❯{' '}
					</Text>
				)}
				<Text bold color={statusColor}>
					[{command.running ? '' : command.exitCode === 0 ? 'OK' : `${command.exitCode}`}]
				</Text>
				<Text color="white" bold wrap="truncate-end">
					{command.command}
				</Text>
				{command.running && <Spinner type="dots" />}
			</Box>
			<Box paddingLeft={isSelected ? 2 : 0}>
				<Text dimColor italic wrap="truncate-end">
					{command.args}
				</Text>
			</Box>
		</Box>
	);
});

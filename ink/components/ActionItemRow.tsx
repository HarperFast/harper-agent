import { Spinner } from '@inkjs/ui';
import { Box, Text } from 'ink';
import React, { memo } from 'react';
import type { ActionItem } from '../models/actionItem';

export const ActionItemRow = memo(
	(
		{ item, isSelected, isFocused, width }: {
			item: ActionItem;
			isSelected: boolean;
			isFocused: boolean;
			width: number;
		},
	) => {
		const statusColor = item.running
			? 'yellow'
			: (item.status === 'approved' || item.status === 'succeeded'
					|| (typeof item.exitCode === 'number' && item.exitCode === 0))
			? 'green'
			: (item.status === 'denied' || item.status === 'failed'
					|| (typeof item.exitCode === 'number' && item.exitCode !== 0))
			? 'red'
			: 'blue';
		const selectionColor = isFocused ? 'blue' : 'gray';
		const pipe = (
			<Text color={isSelected ? selectionColor : 'gray'} bold={isSelected}>
				{isSelected ? '┃  ' : '│  '}
			</Text>
		);

		// Status label at end
		const statusLabel = item.running
			? ' '
			: item.kind === 'approval'
			? (item.status === 'approved' ? ' approved' : item.status === 'denied' ? ' denied' : '')
			: (typeof item.exitCode === 'number' ? ` ${item.exitCode}` : '');
		const statusLabelWidth = item.running ? 2 : statusLabel.length;

		const pipeWidth = 3;
		const nameWithSpace = `${item.title} `;
		const availableForDetail = width - pipeWidth - nameWithSpace.length - statusLabelWidth;

		const fullDetail = item.detail || '';
		let displayedDetail = fullDetail;
		if (availableForDetail < fullDetail.length) {
			if (availableForDetail > 3) {
				displayedDetail = fullDetail.slice(0, availableForDetail - 3) + '...';
			} else {
				displayedDetail = fullDetail.slice(0, Math.max(0, availableForDetail));
			}
		}

		return (
			<Box>
				{pipe}
				<Box flexGrow={1}>
					<Text color={statusColor} bold>
						{item.title}
					</Text>
					<Text color="gray">
						{' '}
						{displayedDetail}
					</Text>
				</Box>
				<Box>
					{item.running
						? (
							<Box>
								<Text color="yellow"></Text>
								<Spinner type="dots" />
							</Box>
						)
						: (
							<Text color={statusColor} bold>
								{statusLabel}
							</Text>
						)}
				</Box>
			</Box>
		);
	},
);

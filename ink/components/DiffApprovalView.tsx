import { Box, Text, useInput } from 'ink';
import React, { useMemo, useState } from 'react';
import { useApproval } from '../contexts/ApprovalContext';
import { emitToListeners } from '../emitters/listener';
import { useTerminalSize } from '../library/useTerminalSize';
import { wrapText } from '../library/wrapText';

export function DiffApprovalView() {
	const { payload } = useApproval();
	const size = useTerminalSize();
	const [scrollIndex, setScrollIndex] = useState(0);

	const diffLines = useMemo(() => {
		if (!payload?.diff) { return []; }
		return payload.diff.split('\n');
	}, [payload?.diff]);

	const wrappedLines = useMemo(() => {
		const result: { text: string; color?: string | undefined }[] = [];
		if (!payload) {
			return result;
		}
		if (payload.type === 'delete_file') {
			result.push({ text: 'Delete file: ' + payload.path, color: 'red' });
			return result;
		}
		if (payload.type === 'overwrite_file') {
			for (const line of diffLines) {
				let color: string | undefined;
				if (line.startsWith('+')) { color = 'green'; }
				else if (line.startsWith('-')) { color = 'red'; }

				const wrapped = wrapText(line, size.columns - 4);
				for (const w of wrapped) {
					result.push({ text: w, color });
				}
			}
			return result;
		}
		if (payload.type === 'code_interpreter' && payload.code) {
			const lines = payload.code.split('\n');
			for (const line of lines) {
				const wrapped = wrapText(line, size.columns - 4);
				for (const w of wrapped) {
					result.push({ text: w });
				}
			}
			return result;
		}
		if (payload.type === 'shell' && payload.commands) {
			for (const cmd of payload.commands) {
				const wrapped = wrapText(`$ ${cmd}`, size.columns - 4);
				for (const w of wrapped) {
					result.push({ text: w, color: 'yellow' });
				}
			}
			return result;
		}
		for (const line of diffLines) {
			let color: string | undefined;
			if (line.startsWith('+')) { color = 'green'; }
			else if (line.startsWith('-')) { color = 'red'; }
			else if (line.startsWith('@@')) { color = 'cyan'; }

			const wrapped = wrapText(line, size.columns - 4);
			for (const w of wrapped) {
				result.push({ text: w, color });
			}
		}
		return result;
	}, [diffLines, size.columns, payload]);

	const visibleHeight = size.rows - 6; // Reserve space for header and footer

	useInput((input, key) => {
		if (!payload) { return; }

		if (key.escape) {
			if (payload.mode === 'ask') {
				emitToListeners('DenyCurrentApproval', undefined);
			}
			emitToListeners('CloseApprovalViewer', undefined);
			return;
		}

		if (key.return) {
			if (payload.mode === 'ask') {
				const now = Date.now();
				if (payload.openedAt && now - payload.openedAt > 1000) {
					emitToListeners('ApproveCurrentApproval', undefined);
					emitToListeners('CloseApprovalViewer', undefined);
					emitToListeners('ClearUserInput', undefined);
				}
			} else {
				emitToListeners('CloseApprovalViewer', undefined);
			}
			return;
		}

		if (payload.mode === 'ask') {
			const now = Date.now();
			if (payload.openedAt && now - payload.openedAt > 1000) {
				if (input === 'y') {
					emitToListeners('ApproveCurrentApproval', undefined);
					emitToListeners('CloseApprovalViewer', undefined);
					emitToListeners('ClearUserInput', undefined);
				} else if (input === 'n') {
					emitToListeners('DenyCurrentApproval', undefined);
					emitToListeners('CloseApprovalViewer', undefined);
					emitToListeners('ClearUserInput', undefined);
				}
			}
		}

		if (key.upArrow) {
			setScrollIndex(prev => Math.max(0, prev - 1));
		}
		if (key.downArrow) {
			setScrollIndex(prev => Math.min(Math.max(0, wrappedLines.length - visibleHeight), prev + 1));
		}
		if (key.pageUp) {
			setScrollIndex(prev => Math.max(0, prev - visibleHeight));
		}
		if (key.pageDown) {
			setScrollIndex(prev => Math.min(Math.max(0, wrappedLines.length - visibleHeight), prev + visibleHeight));
		}
	});

	if (!payload) { return null; }

	const canRespond = payload.mode === 'ask' && payload.openedAt && (Date.now() - payload.openedAt > 1000);

	return (
		<Box
			position="absolute"
			flexDirection="column"
			width={size.columns}
			height={size.rows}
			backgroundColor="black"
			borderStyle="double"
			borderColor="cyan"
		>
			<Box
				paddingX={1}
				borderStyle="single"
				borderBottomColor="gray"
				borderTop={false}
				borderLeft={false}
				borderRight={false}
			>
				<Text bold color="cyan">
					{payload.mode === 'ask' ? 'APPROVE ' : 'VIEW '}
					{payload.type.toUpperCase().replace('_', ' ')}
				</Text>
				<Text color="gray">│</Text>
				{payload.path && (
					<>
						<Text bold>{payload.type}:</Text>
						<Text>{payload.path}</Text>
					</>
				)}
			</Box>

			<Box flexGrow={1} flexDirection="column" paddingX={1}>
				{wrappedLines.length === 0 ? <Text italic color="gray">No diff content.</Text> : (
					wrappedLines.slice(scrollIndex, scrollIndex + visibleHeight).map((line, i) => (
						<Text key={i} color={line.color || 'white'}>{line.text}</Text>
					))
				)}
			</Box>

			<Box
				paddingX={1}
				borderStyle="single"
				borderTopColor="gray"
				borderBottom={false}
				borderLeft={false}
				borderRight={false}
			>
				{payload.mode === 'ask'
					? (
						<Box flexGrow={1}>
							<Text color={canRespond ? 'green' : 'gray'}>[Enter/y] Approve</Text>
							<Text></Text>
							<Text color={canRespond ? 'red' : 'gray'}>[Esc/n] Deny</Text>
							{!canRespond && <Text color="yellow">(Wait 1s...)</Text>}
						</Box>
					)
					: (
						<Box flexGrow={1}>
							<Text color="cyan">[Enter/Esc] Close</Text>
						</Box>
					)}
				<Text color="gray">
					Line {scrollIndex + 1}/{wrappedLines.length}
				</Text>
			</Box>
		</Box>
	);
}

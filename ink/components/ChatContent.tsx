import { Spinner } from '@inkjs/ui';
import { Box, Text, useInput } from 'ink';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { handleExit } from '../../lifecycle/handleExit';
import { useMessageListener } from '../bindings/useMessageListener';
import { footerHeight } from '../constants/footerHeight';
import { useChat } from '../contexts/ChatContext';
import { emitToListeners } from '../emitters/listener';
import { useTerminalSize } from '../library/useTerminalSize';
import { wrapText } from '../library/wrapText';
import type { FocusedArea } from '../models/ChatContextType';
import type { Message } from '../models/message';
import { ActionsView } from './ActionsView';
import { CostView } from './CostView';
import { type LineItem, MessageLineItem } from './MessageLineItem';
import { PlanView } from './PlanView';
import { SettingsView } from './SettingsView';
import { UserInput } from './UserInput';
import { VirtualList } from './VirtualList';

export function ChatContent() {
	const { messages, isThinking, focusedArea, setFocusedArea } = useChat();
	const size = useTerminalSize();

	useMessageListener();
	const [activeTab, setActiveTab] = useState('settings');

	const [selectedIndex, setSelectedIndex] = useState(0);

	const wrapCache = useRef<Map<number, { version: number; width: number; lineItems: LineItem[] }>>(
		new Map(),
	);

	useInput((input, key) => {
		if (key.tab) {
			const focusOrder: FocusedArea[] = ['input', 'timeline', 'status'];
			const currentIndex = focusOrder.indexOf(focusedArea);
			if (key.shift || input === '\u001b[Z') {
				const nextIndex = (currentIndex - 1 + focusOrder.length) % focusOrder.length;
				setFocusedArea(focusOrder[nextIndex]!);
			} else {
				const nextIndex = (currentIndex + 1) % focusOrder.length;
				setFocusedArea(focusOrder[nextIndex]!);
			}
			return;
		}

		if (focusedArea === 'timeline') {
			if (key.upArrow) {
				setSelectedIndex(prev => Math.max(0, prev - 1));
			}

			if (key.downArrow) {
				setSelectedIndex(prev => Math.min(Math.max(0, lineItems.length - 1), prev + 1));
			}
		}

		if (focusedArea === 'status') {
			if (key.leftArrow || key.rightArrow) {
				const tabNames = ['settings', 'planDescription', 'actions'];
				const currentIndex = tabNames.indexOf(activeTab);
				if (key.leftArrow) {
					const nextIndex = (currentIndex - 1 + tabNames.length) % tabNames.length;
					setActiveTab(tabNames[nextIndex]!);
				} else {
					const nextIndex = (currentIndex + 1) % tabNames.length;
					setActiveTab(tabNames[nextIndex]!);
				}
			}
		}

		if (key.ctrl && input === 'x') {
			void handleExit();
		}

		if (key.escape && isThinking) {
			emitToListeners('InterruptThought', undefined);
		}
	});

	// Layout calculations
	const contentHeight = size.rows - footerHeight;
	const timelineWidth = Math.floor(size.columns * 0.65);
	const statusWidth = size.columns - timelineWidth;

	// Compute line-based virtualization
	const labelWidthFor = useCallback((type: Message['type']) => {
		// agent: 'AGENT: ' (7 incl. colon+space), user: 'USER: ' (6), interrupted has a longer label but keep same for alignment
		return type === 'agent' ? 7 : 6;
	}, []);

	const availableTextWidth = timelineWidth - 4; // -0 left border, -1 paddingRight, -3 selection indicator

	const lineItems: LineItem[] = useMemo(() => {
		const acc: LineItem[] = [];
		for (const msg of messages) {
			const labelWidth = labelWidthFor(msg.type);
			const firstLineWidth = Math.max(1, availableTextWidth - labelWidth);

			let entry = wrapCache.current.get(msg.id);
			if (!entry || entry.version !== msg.version || entry.width !== firstLineWidth) {
				const textLines = wrapText(msg.text ?? '', firstLineWidth);
				const argsLines = msg.args ? wrapText(String(msg.args), firstLineWidth) : [];

				const msgLineItems: LineItem[] = [];
				if (msg.type === 'tool') {
					const toolName = msg.text ?? '';
					const toolArgs = msg.args ?? '';
					const toolNameWithSpace = `${toolName} `;
					const availableForArgs = firstLineWidth - toolNameWithSpace.length;

					let displayedArgs = toolArgs;
					if (availableForArgs < toolArgs.length) {
						// Need at least some space for "..."
						if (availableForArgs > 3) {
							displayedArgs = toolArgs.slice(0, availableForArgs - 3) + '...';
						} else {
							// If very little space, just show what fits or at least "..."
							displayedArgs = toolArgs.slice(0, Math.max(0, availableForArgs));
						}
					}

					msgLineItems.push({
						key: `${msg.id}:tool:0`,
						messageId: msg.id,
						type: msg.type,
						text: `${toolNameWithSpace}${displayedArgs}`,
						isFirstLine: true,
						toolName,
					});
				} else {
					textLines.forEach((txt, idx) => {
						msgLineItems.push({
							key: `${msg.id}:text:${idx}`,
							messageId: msg.id,
							type: msg.type,
							text: txt,
							isFirstLine: idx === 0,
						});
					});
					if (argsLines.length > 0) {
						argsLines.forEach((txt, idx) => {
							msgLineItems.push({
								key: `${msg.id}:args:${idx}`,
								messageId: msg.id,
								type: msg.type,
								text: txt,
								isFirstLine: idx === 0 && textLines.length === 0,
								isArgsLine: true,
							});
						});
					}
				}

				entry = { version: msg.version, width: firstLineWidth, lineItems: msgLineItems };
				wrapCache.current.set(msg.id, entry);
			}

			acc.push(...entry.lineItems);
		}

		// Cleanup cache for messages that no longer exist
		if (wrapCache.current.size > messages.length * 2) {
			const messageIds = new Set(messages.map(m => m.id));
			for (const id of wrapCache.current.keys()) {
				if (!messageIds.has(id)) {
					wrapCache.current.delete(id);
				}
			}
		}

		return acc;
	}, [messages, availableTextWidth, labelWidthFor]);

	// Keep selection pinned to last line when new content arrives
	useEffect(() => {
		if (lineItems.length > 0 && focusedArea !== 'timeline') {
			setSelectedIndex(lineItems.length - 1);
		}
	}, [lineItems.length, focusedArea]);

	// Ensure selection is visible when window is resized
	useEffect(() => {
		if (lineItems.length > 0) {
			setSelectedIndex(lineItems.length - 1);
		}
	}, [size.rows, size.columns]);

	const tabs = useMemo(() => [
		{ name: 'settings', label: 'SETTINGS' },
		{ name: 'planDescription', label: 'PLAN' },
		{ name: 'actions', label: 'ACTIONS' },
	], []);

	const timelineTitle = 'TIMELINE:';
	const timelineHeaderWidth = timelineWidth - 1; // excluding '╭'
	const timelineDashes = timelineHeaderWidth - timelineTitle.length - (isThinking ? 5 : 0);

	const tabsTotalWidth = tabs.reduce((acc, t) => acc + t.label.length + 2, 0) + (tabs.length - 1);
	const statusDashes = Math.max(0, statusWidth - tabsTotalWidth - 2); // -1 for '┬', -1 for '╮'

	const timelineColor = focusedArea === 'timeline' ? 'blue' : 'gray';
	const statusColor = focusedArea === 'status' ? 'blue' : 'gray';

	const dividerColor = (focusedArea === 'timeline' || focusedArea === 'status') ? 'blue' : 'gray';

	const timelineBottomColor = (focusedArea === 'timeline' || focusedArea === 'input') ? 'blue' : 'gray';
	const statusBottomColor = (focusedArea === 'status' || focusedArea === 'input') ? 'blue' : 'gray';

	const junctionLeftColor = (focusedArea === 'timeline' || focusedArea === 'input') ? 'blue' : 'gray';
	const junctionMiddleColor = (focusedArea === 'timeline' || focusedArea === 'status' || focusedArea === 'input')
		? 'blue'
		: 'gray';
	const junctionRightColor = (focusedArea === 'status' || focusedArea === 'input') ? 'blue' : 'gray';

	const timelinePipeFiller = useCallback((count: number) => (
		<Box flexDirection="column">
			{Array.from({ length: count }).map((_, i) => (
				<Box key={i}>
					<Text color="gray" dimColor>│</Text>
				</Box>
			))}
		</Box>
	), []);

	return (
		<Box flexDirection="column" height={size.rows} padding={0}>
			{/* Top border line */}
			<Box flexDirection="row" height={1}>
				<Text color={timelineColor}>╭</Text>
				<Text bold color={timelineColor}>{timelineTitle}</Text>
				{isThinking && (
					<Box paddingLeft={2} paddingRight={1}>
						<Spinner type="clock" />
					</Box>
				)}
				<Text color={timelineColor}>{'─'.repeat(Math.max(0, timelineDashes))}</Text>
				<Text color={dividerColor}>┬</Text>
				{tabs.map((tab, i) => (
					<React.Fragment key={tab.name}>
						<Text
							color={activeTab === tab.name ? 'black' : statusColor}
							backgroundColor={activeTab === tab.name ? statusColor : ''}
							bold={activeTab === tab.name}
						>
							{` ${tab.label} `}
						</Text>
						{i < tabs.length - 1 && <Text color={statusColor}>|</Text>}
					</React.Fragment>
				))}
				<Text color={statusColor}>{'─'.repeat(statusDashes)}╮</Text>
			</Box>

			{/* Main content area */}
			<Box flexDirection="row" height={contentHeight - 2}>
				{/* Timeline pane (Left) */}
				<Box
					flexDirection="column"
					width={timelineWidth}
					paddingLeft={0}
					paddingRight={1}
				>
					<Box flexDirection="column" flexGrow={1}>
						<VirtualList
							items={lineItems}
							itemHeight={1}
							height={contentHeight - 2}
							selectedIndex={selectedIndex}
							renderOverflowTop={useCallback((count: number) => (
								<Box>
									<Text color="gray" dimColor>│</Text>
									{count > 0 && <Text dimColor>{' '}▲ {count} more</Text>}
								</Box>
							), [])}
							renderOverflowBottom={useCallback((count: number) => (
								<Box>
									<Text color="gray" dimColor>│</Text>
									{count > 0 && <Text dimColor>{' '}▼ {count} more</Text>}
								</Box>
							), [])}
							renderFiller={timelinePipeFiller}
							keyExtractor={(it) => it.key}
							renderItem={useCallback(
								({ item, isSelected }: { item: LineItem; isSelected: boolean }) => (
									<MessageLineItem
										item={item}
										isSelected={isSelected}
										isFocused={focusedArea === 'timeline'}
										indent={item.isFirstLine ? 0 : (labelWidthFor(item.type))}
									/>
								),
								[labelWidthFor, focusedArea],
							)}
						/>
					</Box>
				</Box>

				{/* Divider */}
				{activeTab !== 'shell' && activeTab !== 'actions' && (
					<Box
						flexDirection="column"
						width={1}
						borderStyle="round"
						borderColor={dividerColor}
						borderTop={false}
						borderBottom={false}
						borderRight={false}
					/>
				)}

				{/* Status pane (Right) */}
				<Box
					flexDirection="column"
					width={activeTab === 'shell' || activeTab === 'actions' ? statusWidth : (statusWidth - 1)}
					borderStyle="round"
					borderColor={statusColor}
					borderTop={false}
					borderBottom={false}
					borderLeft={false}
					paddingLeft={activeTab === 'shell' || activeTab === 'actions' ? 0 : 1}
					paddingRight={1}
				>
					<Box flexDirection="column" flexGrow={1} marginTop={0}>
						{activeTab === 'settings' && (
							<Box flexDirection="column">
								<CostView isDense />
								<Box marginTop={1}>
									<SettingsView isDense />
								</Box>
							</Box>
						)}
						{activeTab === 'planDescription' && <PlanView />}
						{activeTab === 'actions' && <ActionsView height={contentHeight - 2} isFocused={focusedArea === 'status'} />}
					</Box>
				</Box>
			</Box>

			{/* Bottom border line */}
			<Box flexDirection="row" height={1}>
				<Text color={junctionLeftColor}>┢</Text>
				<Text color={timelineBottomColor}>{'━'.repeat(timelineWidth - 1)}</Text>
				<Text color={junctionMiddleColor}>┷</Text>
				<Text color={statusBottomColor}>{'━'.repeat(Math.max(0, statusWidth - 2))}</Text>
				<Text color={junctionRightColor}>┪</Text>
			</Box>

			<UserInput />
		</Box>
	);
}

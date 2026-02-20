import { Spinner } from '@inkjs/ui';
import { Box, Text, useInput } from 'ink';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { handleExit } from '../../lifecycle/handleExit';
import { useMessageListener } from '../bindings/useMessageListener';
import { footerHeight } from '../constants/footerHeight';
import { useChat } from '../contexts/ChatContext';
import { emitToListeners } from '../emitters/listener';
import { wrapText } from '../library/wrapText';
import type { FocusedArea } from '../models/ChatContextType';
import type { Message } from '../models/message';
import { CostView } from './CostView';
import { GoalView } from './GoalView';
import { type LineItem, MessageLineItem } from './MessageLineItem';
import { SettingsView } from './SettingsView';
import { ShellView } from './ShellView';
import { UserInput } from './UserInput';
import { useTerminalSize, VirtualList } from './VirtualList';

export function ChatContent() {
	const { messages, isThinking, focusedArea, setFocusedArea } = useChat();
	const size = useTerminalSize();

	useMessageListener();
	const [activeTab, setActiveTab] = useState('goal');

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
				const tabNames = ['goal', 'shell', 'settings', 'cost'];
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

	const availableTextWidth = timelineWidth - 5; // -1 left border, -2 paddingX, -2 selection indicator

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
		setSelectedIndex(Math.max(0, lineItems.length - 1));
	}, [lineItems.length]);

	const tabs = useMemo(() => [
		{ name: 'goal', label: 'GOAL' },
		{ name: 'shell', label: 'SHELL' },
		{ name: 'settings', label: 'SETTINGS' },
		{ name: 'cost', label: 'COST' },
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
					borderStyle="round"
					borderColor={timelineColor}
					borderTop={false}
					borderBottom={false}
					borderRight={false}
					paddingX={1}
				>
					<Box flexDirection="column" flexGrow={1}>
						<VirtualList
							items={lineItems}
							itemHeight={1}
							height={contentHeight - 2}
							selectedIndex={selectedIndex}
							renderOverflowBottom={() => undefined}
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
				<Box
					flexDirection="column"
					width={1}
					borderStyle="round"
					borderColor={dividerColor}
					borderTop={false}
					borderBottom={false}
					borderRight={false}
				/>

				{/* Status pane (Right) */}
				<Box
					flexDirection="column"
					width={statusWidth - 1}
					borderStyle="round"
					borderColor={statusColor}
					borderTop={false}
					borderBottom={false}
					borderLeft={false}
					paddingX={1}
				>
					<Box flexDirection="column" flexGrow={1} marginTop={0}>
						{activeTab === 'goal' && <GoalView />}
						{activeTab === 'shell' && <ShellView height={contentHeight - 2} isFocused={focusedArea === 'status'} />}
						{activeTab === 'settings' && <SettingsView />}
						{activeTab === 'cost' && <CostView />}
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

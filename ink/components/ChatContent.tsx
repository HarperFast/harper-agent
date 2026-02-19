import { Spinner } from '@inkjs/ui';
import { Box, Text, useInput } from 'ink';
import { Tab, Tabs } from 'ink-tab';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { handleExit } from '../../lifecycle/handleExit';
import { useMessageListener } from '../bindings/useMessageListener';
import { footerHeight } from '../constants/footerHeight';
import { useChat } from '../contexts/ChatContext';
import { emitToListeners } from '../emitters/listener';
import { wrapText } from '../library/wrapText';
import type { Message } from '../models/message';
import { CostView } from './CostView';
import { GoalView } from './GoalView';
import { type LineItem, MessageLineItem } from './MessageLineItem';
import { SettingsView } from './SettingsView';
import { ShellView } from './ShellView';
import { UserInput } from './UserInput';
import { useTerminalSize, VirtualList } from './VirtualList';

export function ChatContent() {
	const { messages, userInputMode, isThinking } = useChat();
	const size = useTerminalSize();

	useMessageListener();
	const [activeTab, setActiveTab] = useState('goal');

	const [selectedIndex, setSelectedIndex] = useState(0);

	const wrapCache = useRef<Map<number, { version: number; width: number; lineItems: LineItem[] }>>(
		new Map(),
	);

	useInput((input, key) => {
		if (key.upArrow) {
			setSelectedIndex(prev => Math.max(0, prev - 1));
		}

		if (key.downArrow) {
			setSelectedIndex(prev => Math.min(Math.max(0, lineItems.length - 1), prev + 1));
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
	const statusWidth = size.columns - timelineWidth - 1;

	// Compute line-based virtualization
	const labelWidthFor = useCallback((type: Message['type']) => {
		// agent: 'AGENT: ' (7 incl. colon+space), user: 'USER: ' (6), interrupted has a longer label but keep same for alignment
		return type === 'agent' ? 7 : 6;
	}, []);

	const availableTextWidth = timelineWidth - 6; // -2 border, -2 paddingX, -2 selection indicator

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

	return (
		<Box flexDirection="column" height={size.rows} padding={0}>
			{/* Main content area */}
			<Box flexDirection="row" height={contentHeight}>
				{/* Timeline pane (Left) */}
				<Box
					flexDirection="column"
					width={timelineWidth}
					borderStyle="round"
					borderColor="blue"
					paddingX={1}
				>
					<Box marginBottom={1} flexDirection="row" alignItems="center" gap={1}>
						<Text bold color="blue" underline>TIMELINE:</Text>
						{isThinking && <Spinner type="clock" />}
					</Box>
					<Box flexDirection="column" flexGrow={1}>
						<VirtualList
							items={lineItems}
							itemHeight={1}
							height={contentHeight - 4}
							selectedIndex={selectedIndex}
							renderOverflowBottom={() => undefined}
							keyExtractor={(it) => it.key}
							renderItem={useCallback(
								({ item, isSelected }: { item: LineItem; isSelected: boolean }) => (
									<MessageLineItem
										item={item}
										isSelected={isSelected}
										indent={item.isFirstLine ? 0 : (labelWidthFor(item.type))}
									/>
								),
								[labelWidthFor],
							)}
						/>
					</Box>
				</Box>

				{/* Status pane (Right) */}
				<Box
					flexDirection="column"
					width={statusWidth}
					marginLeft={1}
					borderStyle="round"
					borderColor="yellow"
					paddingX={1}
				>
					<Tabs
						onChange={(name) => setActiveTab(name)}
						keyMap={{ useTab: true }}
						showIndex={false}
						colors={{
							activeTab: {
								color: 'yellow',
								backgroundColor: 'whiteBright',
							},
						}}
					>
						<Tab name="goal">{' '}GOAL{' '}</Tab>
						<Tab name="shell">{' '}SHELL{' '}</Tab>
						<Tab name="settings">{' '}SETTINGS{' '}</Tab>
						<Tab name="cost">{' '}COST{' '}</Tab>
					</Tabs>

					<Box flexDirection="column" flexGrow={1} marginTop={0}>
						{activeTab === 'goal' && <GoalView />}
						{activeTab === 'shell' && <ShellView height={contentHeight - 6} />}
						{activeTab === 'settings' && <SettingsView />}
						{activeTab === 'cost' && <CostView />}
					</Box>
				</Box>
			</Box>

			<UserInput />
		</Box>
	);
}

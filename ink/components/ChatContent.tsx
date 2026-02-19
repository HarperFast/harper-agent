import { Box, Text, useInput, useStdout } from 'ink';
import { Tab, Tabs } from 'ink-tab';
import React, { useCallback, useEffect, useState } from 'react';
import { handleExit } from '../../lifecycle/handleExit';
import { useMessageListener } from '../bindings/useMessageListener';
import { footerHeight } from '../constants/footerHeight';
import { useChat } from '../contexts/ChatContext';
import { emitToListeners } from '../emitters/listener';
import type { Message } from '../models/message';
import { CostView } from './CostView';
import { GoalView } from './GoalView';
import { type LineItem, MessageLineItem } from './MessageLineItem';
import { SettingsView } from './SettingsView';
import { ShellView } from './ShellView';
import { UserInput } from './UserInput';
import { VirtualList } from './VirtualList';

export function ChatContent() {
	const { stdout } = useStdout();
	const { messages, userInputMode } = useChat();
	const [size, setSize] = useState({
		columns: stdout?.columns || 80,
		rows: stdout?.rows || 24,
	});

	useMessageListener();
	const [activeTab, setActiveTab] = useState('goal');

	useEffect(() => {
		const onResize = () => {
			setSize({
				columns: stdout?.columns || 80,
				rows: stdout?.rows || 24,
			});
		};

		stdout?.on('resize', onResize);
		return () => {
			stdout?.off('resize', onResize);
		};
	}, [stdout]);

	const [selectedIndex, setSelectedIndex] = useState(0);

	// Recompute selection when the flattened line list changes (set later)
	// Placeholder: will update after lines are computed

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

		if (key.escape && userInputMode === 'thinking') {
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

	function wrapText(text: string, width: number): string[] {
		if (width <= 1) { return text ? [text] : ['']; }
		const hardLines = text.split('\n');
		const allWrappedLines: string[] = [];

		for (const hardLine of hardLines) {
			if (hardLine.length === 0) {
				allWrappedLines.push('');
				continue;
			}

			const words = hardLine.split(/(\s+)/);
			let currentLine = '';
			for (const token of words) {
				if (token.length === 0) { continue; }
				if (currentLine.length + token.length <= width) {
					currentLine += token;
				} else {
					if (currentLine) { allWrappedLines.push(currentLine.trimEnd()); }
					if (token.trim().length === 0) {
						// Skip leading whitespace on subsequent wrapped lines
						currentLine = '';
					} else if (token.length > width) {
						// hard wrap very long token
						for (let i = 0; i < token.length; i += width) {
							const chunk = token.slice(i, i + width);
							if (chunk.length === width) {
								allWrappedLines.push(chunk);
							} else {
								currentLine = chunk;
							}
						}
					} else {
						currentLine = token;
					}
				}
			}
			if (currentLine) { allWrappedLines.push(currentLine.trimEnd()); }
		}
		return allWrappedLines.length ? allWrappedLines : [''];
	}

	const lineItems: LineItem[] = React.useMemo(() => {
		const acc: LineItem[] = [];
		for (const msg of messages) {
			const labelWidth = labelWidthFor(msg.type);
			const firstLineWidth = Math.max(1, availableTextWidth - labelWidth);
			const textLines = wrapText(msg.text ?? '', firstLineWidth);
			textLines.forEach((txt, idx) => {
				acc.push({
					key: `${msg.id}:text:${idx}`,
					messageId: msg.id,
					type: msg.type,
					text: txt,
					isFirstLine: idx === 0,
				});
			});
			if (msg.args) {
				const argsLines = wrapText(String(msg.args), firstLineWidth);
				argsLines.forEach((txt, idx) => {
					acc.push({
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
					<Box marginBottom={1}>
						<Text bold color="blue" underline>TIMELINE:</Text>
					</Box>
					<Box flexDirection="column" flexGrow={1}>
						<VirtualList
							items={lineItems}
							itemHeight={1}
							height={contentHeight - 4}
							selectedIndex={selectedIndex}
							renderOverflowBottom={() => undefined}
							keyExtractor={(it) => it.key}
							renderItem={({ item, isSelected }) => (
								<MessageLineItem
									item={item}
									isSelected={isSelected}
									indent={item.isFirstLine ? 0 : (labelWidthFor(item.type))}
								/>
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

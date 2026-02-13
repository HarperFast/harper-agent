import { Box, Text, useInput, useStdout } from 'ink';
import { Tab, Tabs } from 'ink-tab';
import React, { useCallback, useEffect, useState } from 'react';
import { useMessageListener } from '../bindings/useMessageListener';
import { footerHeight } from '../constants/footerHeight';
import { useChat } from '../contexts/ChatContext';
import { emitToListeners } from '../emitters/listener';
import type { Message } from '../models/message';
import { GoalView } from './GoalView';
import { MessageItem } from './MessageItem';
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

	useEffect(() => setSelectedIndex(messages.length - 1), [messages.length]);

	useInput((input, key) => {
		if (key.upArrow) {
			setSelectedIndex(prev => Math.max(0, prev - 1));
		}

		if (key.downArrow) {
			setSelectedIndex(prev => Math.min(messages.length - 1, prev + 1));
		}

		if (key.ctrl && input === 'x') {
			emitToListeners('Exit', undefined);
		}

		if (key.escape && userInputMode === 'thinking') {
			emitToListeners('InterruptThought', undefined);
		}
	});

	// Layout calculations
	const contentHeight = size.rows - footerHeight;
	const timelineWidth = Math.floor(size.columns * 0.65);
	const statusWidth = size.columns - timelineWidth - 1;

	const getItemHeight = useCallback((item: Message) => {
		const labelWidth = item.type === 'agent' ? 7 : 6;
		const availableWidth = timelineWidth - 4; // -2 for border, -2 for paddingX
		const textHeight = Math.ceil((item.text.length + labelWidth) / availableWidth);
		return textHeight + (item.args ? 1 : 0);
	}, [timelineWidth]);

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
							items={messages}
							getItemHeight={getItemHeight}
							height={contentHeight - 4}
							selectedIndex={selectedIndex}
							renderOverflowBottom={() => undefined}
							renderItem={({ item, isSelected }) => <MessageItem message={item} isSelected={isSelected} />}
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
					</Tabs>

					<Box flexDirection="column" flexGrow={1} marginTop={0}>
						{activeTab === 'goal' && <GoalView />}
						{activeTab === 'shell' && <ShellView height={contentHeight - 6} />}
					</Box>
				</Box>
			</Box>

			<UserInput />
		</Box>
	);
}

import { Box, Text, useStdout } from 'ink';
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';

export interface Viewport {
	offset: number;
	visibleCount: number;
	totalCount: number;
}

export interface VirtualListProps<T> {
	items: T[];
	renderItem: (props: { item: T; index: number; isSelected: boolean }) => React.ReactNode;
	getItemHeight?: (item: T, index: number) => number;
	itemHeight?: number;
	selectedIndex?: number;
	keyExtractor?: (item: T, index: number) => string;
	height?: number | string;
	reservedLines?: number;
	showOverflowIndicators?: boolean;
	overflowIndicatorThreshold?: number;
	renderOverflowTop?: (count: number) => React.ReactNode;
	renderOverflowBottom?: (count: number) => React.ReactNode;
	onViewportChange?: (viewport: Viewport) => void;
}

export interface VirtualListRef {
	scrollToIndex: (index: number, alignment?: 'top' | 'center' | 'bottom' | 'auto') => void;
	getViewport: () => Viewport;
}

function getDefaultKey(item: any, index: number): string {
	if (item && typeof item === 'object') {
		if ('id' in item && (typeof item.id === 'string' || typeof item.id === 'number')) {
			return String(item.id);
		}
		if ('key' in item && (typeof item.key === 'string' || typeof item.key === 'number')) {
			return String(item.key);
		}
	}
	return String(index);
}

export function useTerminalSize() {
	const { stdout } = useStdout();
	const [size, setSize] = useState({
		rows: stdout?.rows ?? 24,
		columns: stdout?.columns ?? 80,
	});

	useEffect(() => {
		if (!stdout || !stdout.isTTY) {
			return;
		}

		const handleResize = () => {
			setSize({
				rows: stdout.rows ?? 24,
				columns: stdout.columns ?? 80,
			});
		};

		stdout.on('resize', handleResize);
		return () => {
			stdout.off('resize', handleResize);
		};
	}, [stdout]);

	return size;
}

const VirtualListInner = <T,>(
	props: VirtualListProps<T>,
	ref: React.ForwardedRef<VirtualListRef>,
) => {
	const {
		items,
		renderItem,
		getItemHeight: getItemHeightProp,
		itemHeight: fixedItemHeight,
		selectedIndex = 0,
		keyExtractor,
		height: propHeight,
		reservedLines = 0,
		showOverflowIndicators = true,
		overflowIndicatorThreshold = 1,
		renderOverflowTop,
		renderOverflowBottom,
		onViewportChange,
	} = props;

	const { rows: terminalRows } = useTerminalSize();

	const resolvedHeight = useMemo(() => {
		if (typeof propHeight === 'number') {
			return propHeight;
		}
		if (typeof propHeight === 'string' && propHeight.endsWith('%')) {
			const percent = parseFloat(propHeight) / 100;
			return Math.floor(terminalRows * percent);
		}
		return Math.max(1, terminalRows - reservedLines);
	}, [propHeight, terminalRows, reservedLines]);

	const getItemHeight = useMemo(() => {
		if (getItemHeightProp) { return getItemHeightProp; }
		if (fixedItemHeight) { return () => fixedItemHeight; }
		return () => 1;
	}, [getItemHeightProp, fixedItemHeight]);

	const indicatorLines = showOverflowIndicators ? 2 : 0;
	const availableHeight = Math.max(0, resolvedHeight - indicatorLines);

	const [viewportOffset, setViewportOffset] = useState(0);

	const { visibleCount, visibleItems } = useMemo(() => {
		let currentHeight = 0;
		let count = 0;
		const visibleItems: T[] = [];

		for (let i = viewportOffset; i < items.length; i++) {
			const h = getItemHeight(items[i]!, i);
			if (currentHeight + h > availableHeight && count > 0) {
				break;
			}
			currentHeight += h;
			count++;
			visibleItems.push(items[i]!);
		}

		return { visibleCount: count, visibleItems };
	}, [items, viewportOffset, availableHeight, getItemHeight]);

	const viewport = useMemo(
		() => ({
			offset: viewportOffset,
			visibleCount,
			totalCount: items.length,
		}),
		[viewportOffset, visibleCount, items.length],
	);

	useEffect(() => {
		onViewportChange?.(viewport);
	}, [viewport, onViewportChange]);

	const clampedSelectedIndex = Math.max(0, Math.min(selectedIndex, items.length - 1));

	// Handle selectedIndex visibility
	useEffect(() => {
		if (items.length === 0) { return; }

		// Check if selectedIndex is above viewport
		if (clampedSelectedIndex < viewportOffset) {
			setViewportOffset(clampedSelectedIndex);
			return;
		}

		// Check if selectedIndex is below viewport
		let heightToSelected = 0;
		let isVisible = false;
		for (let i = viewportOffset; i <= clampedSelectedIndex; i++) {
			const h = getItemHeight(items[i]!, i);
			if (heightToSelected + h > availableHeight) {
				// Not fully visible
				isVisible = false;
				break;
			}
			heightToSelected += h;
			if (i === clampedSelectedIndex) {
				isVisible = true;
			}
		}

		if (!isVisible) {
			// Need to scroll down until selectedIndex is visible at the bottom
			let tempOffset = clampedSelectedIndex;
			let hSum = 0;
			while (tempOffset >= 0) {
				const h = getItemHeight(items[tempOffset]!, tempOffset);
				if (hSum + h > availableHeight) {
					tempOffset++;
					break;
				}
				hSum += h;
				if (tempOffset === 0) { break; }
				tempOffset--;
			}
			setViewportOffset(Math.max(0, tempOffset));
		}
	}, [clampedSelectedIndex, items, availableHeight, getItemHeight, viewportOffset]);

	useImperativeHandle(
		ref,
		() => ({
			scrollToIndex: (index, alignment = 'auto') => {
				const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
				let newOffset = viewportOffset;

				switch (alignment) {
					case 'top':
						newOffset = clampedIndex;
						break;
					case 'center': {
						// This is tricky with dynamic heights.
						// Let's approximate by trying to put it in the middle.
						let hSum = 0;
						let tempOffset = clampedIndex;
						while (tempOffset >= 0 && hSum < availableHeight / 2) {
							hSum += getItemHeight(items[tempOffset]!, tempOffset);
							tempOffset--;
						}
						newOffset = tempOffset + 1;
						break;
					}
					case 'bottom': {
						let hSum = 0;
						let tempOffset = clampedIndex;
						while (tempOffset >= 0 && hSum < availableHeight) {
							const h = getItemHeight(items[tempOffset]!, tempOffset);
							if (hSum + h > availableHeight) {
								tempOffset++;
								break;
							}
							hSum += h;
							if (tempOffset === 0) { break; }
							tempOffset--;
						}
						newOffset = tempOffset;
						break;
					}
					case 'auto':
					default: {
						// Same logic as in useEffect for selectedIndex
						if (clampedIndex < viewportOffset) {
							newOffset = clampedIndex;
						} else {
							let heightToSelected = 0;
							let isVisible = false;
							for (let i = viewportOffset; i <= clampedIndex; i++) {
								const h = getItemHeight(items[i]!, i);
								if (heightToSelected + h > availableHeight) {
									isVisible = false;
									break;
								}
								heightToSelected += h;
								if (i === clampedIndex) { isVisible = true; }
							}
							if (!isVisible) {
								let hSum = 0;
								let tempOffset = clampedIndex;
								while (tempOffset >= 0) {
									const h = getItemHeight(items[tempOffset]!, tempOffset);
									if (hSum + h > availableHeight) {
										tempOffset++;
										break;
									}
									hSum += h;
									if (tempOffset === 0) { break; }
									tempOffset--;
								}
								newOffset = tempOffset;
							}
						}
					}
				}
				setViewportOffset(Math.max(0, newOffset));
			},
			getViewport: () => viewport,
		}),
		[items, viewportOffset, availableHeight, getItemHeight, viewport],
	);

	const overflowTop = viewportOffset;
	// Calculate overflowBottom
	let itemsFittingBelow = 0;
	let hSum = 0;
	for (let i = viewportOffset; i < items.length; i++) {
		const h = getItemHeight(items[i]!, i);
		if (hSum + h > availableHeight) { break; }
		hSum += h;
		itemsFittingBelow++;
	}
	const overflowBottom = Math.max(0, items.length - viewportOffset - itemsFittingBelow);

	const defaultOverflowTop = (count: number) => (
		<Box paddingLeft={2}>
			<Text dimColor>▲ {count} more</Text>
		</Box>
	);

	const defaultOverflowBottom = (count: number) => (
		<Box paddingLeft={2}>
			<Text dimColor>▼ {count} more</Text>
		</Box>
	);

	const topIndicator = renderOverflowTop ?? defaultOverflowTop;
	const bottomIndicator = renderOverflowBottom ?? defaultOverflowBottom;

	return (
		<Box flexDirection="column">
			{showOverflowIndicators
				&& overflowTop >= overflowIndicatorThreshold
				&& topIndicator(overflowTop)}
			{visibleItems.map((item, idx) => {
				const actualIndex = viewportOffset + idx;
				const key = keyExtractor
					? keyExtractor(item, actualIndex)
					: getDefaultKey(item, actualIndex);
				const itemProps = {
					item,
					index: actualIndex,
					isSelected: actualIndex === clampedSelectedIndex,
				};

				return (
					<Box key={key} height={getItemHeight(item, actualIndex)} overflow="hidden">
						{renderItem(itemProps)}
					</Box>
				);
			})}
			{showOverflowIndicators
				&& overflowBottom >= overflowIndicatorThreshold
				&& bottomIndicator(overflowBottom)}
		</Box>
	);
};

export const VirtualList = forwardRef(VirtualListInner) as <T>(
	props: VirtualListProps<T> & { ref?: React.ForwardedRef<VirtualListRef> },
) => React.ReactElement;

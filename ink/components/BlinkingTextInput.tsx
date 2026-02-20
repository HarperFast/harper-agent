import chalk from 'chalk';
import { Box, Text, useInput } from 'ink';
import React, { useEffect, useMemo, useReducer, useState } from 'react';

export type TextInputProps = {
	readonly isDisabled?: boolean;
	readonly placeholder?: string;
	readonly defaultValue?: string;
	readonly suggestions?: string[];
	readonly onChange?: (value: string) => void;
	readonly onSubmit?: (value: string) => void;
};

type State = {
	readonly value: string;
	readonly cursorOffset: number;
	readonly previousValue: string;
};

type Action =
	| { type: 'move-cursor-left' }
	| { type: 'move-cursor-right' }
	| { type: 'insert'; text: string }
	| { type: 'delete' };

const reducer = (state: State, action: Action): State => {
	switch (action.type) {
		case 'move-cursor-left':
			return {
				...state,
				cursorOffset: Math.max(0, state.cursorOffset - 1),
			};
		case 'move-cursor-right':
			return {
				...state,
				cursorOffset: Math.min(state.value.length, state.cursorOffset + 1),
			};
		case 'insert':
			return {
				...state,
				previousValue: state.value,
				value: state.value.slice(0, state.cursorOffset) + action.text + state.value.slice(state.cursorOffset),
				cursorOffset: state.cursorOffset + action.text.length,
			};
		case 'delete': {
			const newCursorOffset = Math.max(0, state.cursorOffset - 1);
			return {
				...state,
				previousValue: state.value,
				value: state.value.slice(0, newCursorOffset) + state.value.slice(state.cursorOffset),
				cursorOffset: newCursorOffset,
			};
		}
		default:
			return state;
	}
};

export function BlinkingTextInput({
	isDisabled = false,
	defaultValue = '',
	placeholder = '',
	suggestions = [],
	onChange,
	onSubmit,
}: TextInputProps) {
	const [state, dispatch] = useReducer(reducer, {
		value: defaultValue,
		previousValue: defaultValue,
		cursorOffset: defaultValue.length,
	});

	const [isCursorVisible, setIsCursorVisible] = useState(true);

	useEffect(() => {
		if (isDisabled) {
			setIsCursorVisible(false);
			return;
		}

		const interval = setInterval(() => {
			setIsCursorVisible(prev => !prev);
		}, 500);

		return () => clearInterval(interval);
	}, [isDisabled]);

	useEffect(() => {
		if (state.value !== state.previousValue) {
			onChange?.(state.value);
		}
	}, [state.value, state.previousValue, onChange]);

	const suggestion = useMemo(() => {
		if (state.value.length === 0) {
			return '';
		}

		return (
			suggestions
				.find(s => s.startsWith(state.value))
				?.slice(state.value.length) || ''
		);
	}, [state.value, suggestions]);

	useInput(
		(input, key) => {
			if (
				key.upArrow
				|| key.downArrow
				|| (key.ctrl && input === 'c')
				|| key.tab
				|| (key.shift && key.tab)
			) {
				return;
			}

			setIsCursorVisible(true);

			if (key.return) {
				if (suggestion) {
					onSubmit?.(state.value + suggestion);
				} else {
					onSubmit?.(state.value);
				}

				return;
			}

			if (key.leftArrow) {
				dispatch({ type: 'move-cursor-left' });
			} else if (key.rightArrow) {
				dispatch({ type: 'move-cursor-right' });
			} else if (key.backspace || key.delete) {
				dispatch({ type: 'delete' });
			} else if (input) {
				dispatch({ type: 'insert', text: input });
			}
		},
		{ isActive: !isDisabled },
	);

	const renderedValue = useMemo(() => {
		if (isDisabled) {
			return state.value || (placeholder ? chalk.dim(placeholder) : '');
		}

		const cursorChar = isCursorVisible ? chalk.inverse(' ') : ' ';

		if (state.value.length === 0) {
			return placeholder && placeholder.length > 0
				? (isCursorVisible ? chalk.inverse(placeholder[0]) : placeholder[0]) + chalk.dim(placeholder.slice(1))
				: cursorChar;
		}

		let result = '';
		let index = 0;

		for (const char of state.value) {
			if (index === state.cursorOffset) {
				result += isCursorVisible ? chalk.inverse(char) : char;
			} else {
				result += char;
			}

			index++;
		}

		if (state.cursorOffset === state.value.length) {
			if (suggestion) {
				result += (isCursorVisible ? chalk.inverse(suggestion[0]) : suggestion[0]) + chalk.dim(suggestion.slice(1));
			} else {
				result += cursorChar;
			}
		} else if (suggestion) {
			result += chalk.dim(suggestion);
		}

		return result;
	}, [state.value, state.cursorOffset, suggestion, isCursorVisible, isDisabled, placeholder]);

	return (
		<Box>
			<Text>{renderedValue}</Text>
		</Box>
	);
}

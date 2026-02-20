import React, { useCallback, useEffect } from 'react';
import type { WatchedValueKeys, WatchedValuesTypeMap } from './watchedValueKeys';

type GenericListenerCallback<T = unknown> = (newValue: T, trigger?: unknown) => void | Promise<void>;

const listenersMap: Record<string, Array<GenericListenerCallback>> = {};

export function useListener<K extends keyof WatchedValuesTypeMap, T extends WatchedValuesTypeMap[K]>(
	name: K,
	listener: GenericListenerCallback<T>,
	deps: unknown,
) {
	// Keep the listener fresh without triggering the effect unnecessarily or having stale closures in the callback.
	const listenerRef = React.useRef(listener);
	React.useEffect(() => {
		listenerRef.current = listener;
	}, [listener]);

	// eslint-disable-next-line react-hooks/preserve-manual-memoization,react-hooks/exhaustive-deps
	const callback = useCallback((newValue: T, trigger?: unknown) => listenerRef.current(newValue, trigger), [deps]);
	useEffect(() => {
		if (!listenersMap[name]) {
			listenersMap[name] = [];
		}
		listenersMap[name].push(callback as GenericListenerCallback);

		return function cleanUp() {
			const index = listenersMap[name]!.indexOf(callback as GenericListenerCallback);
			if (index >= 0) {
				listenersMap[name]!.splice(index, 1);
			}
		};
	}, [name, callback]);
}

export async function onceListener<K extends keyof WatchedValuesTypeMap, T extends WatchedValuesTypeMap[K]>(
	name: K,
) {
	return new Promise<T>((resolve) => {
		if (!listenersMap[name]) {
			listenersMap[name] = [];
		}
		const callback = (newValue: T) => {
			resolve(newValue);
			const index = listenersMap[name]!.indexOf(callback as GenericListenerCallback);
			if (index >= 0) {
				listenersMap[name]!.splice(index, 1);
			}
		};
		listenersMap[name].unshift(callback as GenericListenerCallback);
	});
}

export function emitToListeners<K extends keyof WatchedValuesTypeMap, T extends WatchedValuesTypeMap[K]>(
	name: K,
	value: T,
	trigger?: unknown,
): void {
	const listeners = listenersMap[name];
	if (listeners) {
		for (const listener of listeners) {
			listener(value, trigger);
		}
	}
}

export function curryEmitToListeners<K extends keyof WatchedValuesTypeMap, T extends WatchedValuesTypeMap[K]>(
	name: K,
	value: T,
	trigger?: unknown,
): (e?: unknown) => void {
	return (e?: unknown) => emitToListeners(name, value, trigger ?? e);
}

export function useEmitToListeners<K extends keyof WatchedValuesTypeMap, T extends WatchedValuesTypeMap[K]>(
	name: WatchedValueKeys,
	value: T,
	trigger?: unknown,
): () => void {
	return useCallback((e?: unknown) => emitToListeners(name, value, trigger ?? e), [name, value, trigger]);
}

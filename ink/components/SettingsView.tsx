import { Box, Text, useInput } from 'ink';
import path from 'node:path';
import React, { useEffect, useMemo, useState } from 'react';
import { updateEnv } from '../../utils/files/updateEnv';
import { useChat } from '../contexts/ChatContext';
import { useSettings } from '../contexts/SettingsContext';
import { emitToListeners } from '../emitters/listener';
import { bootstrapConfig } from '../main';

export function SettingsView({ isDense = false }: { isDense?: boolean }) {
	const {
		model,
		compactionModel,
		sessionPath,
		cwd,
		useFlexTier,
		currentTurn,
		maxTurns,
		maxCost,
		autoApproveCodeInterpreter: initialAutoApproveCodeInterpreter,
		autoApprovePatches: initialAutoApprovePatches,
		autoApproveShell: initialAutoApproveShell,
		monitorRateLimits: initialMonitorRateLimits,
		rateLimitThreshold: initialRateLimitThreshold,
		rateLimitStatus,
	} = useSettings();
	const { focusedArea } = useChat();

	const [autoApproveCodeInterpreter, setAutoApproveCodeInterpreter] = useState(initialAutoApproveCodeInterpreter);
	const [autoApprovePatches, setAutoApprovePatches] = useState(initialAutoApprovePatches);
	const [autoApproveShell, setAutoApproveShell] = useState(initialAutoApproveShell);
	const [monitorRateLimits, setMonitorRateLimits] = useState(initialMonitorRateLimits);

	useEffect(() => {
		setAutoApproveCodeInterpreter(initialAutoApproveCodeInterpreter);
	}, [initialAutoApproveCodeInterpreter]);

	useEffect(() => {
		setAutoApprovePatches(initialAutoApprovePatches);
	}, [initialAutoApprovePatches]);

	useEffect(() => {
		setAutoApproveShell(initialAutoApproveShell);
	}, [initialAutoApproveShell]);

	useEffect(() => {
		setMonitorRateLimits(initialMonitorRateLimits);
	}, [initialMonitorRateLimits]);

	const [selectedIndex, setSelectedIndex] = useState(0);

	const selectableOptions = useMemo(() => [
		{
			label: 'Code Interpreter',
			value: autoApproveCodeInterpreter,
			envKey: 'HARPER_AGENT_AUTO_APPROVE_CODE_INTERPRETER',
			setter: setAutoApproveCodeInterpreter,
		},
		{
			label: 'File Patches',
			value: autoApprovePatches,
			envKey: 'HARPER_AGENT_AUTO_APPROVE_PATCHES',
			setter: setAutoApprovePatches,
		},
		{
			label: 'Shell Commands',
			value: autoApproveShell,
			envKey: 'HARPER_AGENT_AUTO_APPROVE_SHELL',
			setter: setAutoApproveShell,
		},
		{
			label: 'Monitor Rate Limits',
			value: monitorRateLimits,
			envKey: 'HARPER_AGENT_MONITOR_RATE_LIMITS',
			setter: (val: boolean) => {
				setMonitorRateLimits(val);
				updateEnv('HARPER_AGENT_MONITOR_RATE_LIMITS', val ? 'true' : 'false');
				emitToListeners('SettingsUpdated', undefined);
			},
		},
		{
			label: '<edit settings>',
			isAction: true,
			action: () => {
				bootstrapConfig(() => {
					// Config wizard handles its own exit/restart logic usually,
					// but here we just call it.
				});
			},
		},
	], [autoApproveCodeInterpreter, autoApprovePatches, autoApproveShell, monitorRateLimits]);

	useInput((_input, key) => {
		if (focusedArea !== 'status') { return; }

		if (key.upArrow) {
			setSelectedIndex((prev) => (prev > 0 ? prev - 1 : selectableOptions.length - 1));
		}
		if (key.downArrow) {
			setSelectedIndex((prev) => (prev < selectableOptions.length - 1 ? prev + 1 : 0));
		}
		if (key.return || _input === ' ') {
			const selected = selectableOptions[selectedIndex];
			if (!selected) { return; }

			if ('isAction' in selected && selected.isAction) {
				selected.action();
			} else if ('setter' in selected) {
				const newValue = !selected.value;
				selected.setter(newValue);
				updateEnv(selected.envKey!, newValue ? '1' : '0');
				emitToListeners('SettingsUpdated', undefined);
			}
		}
	});

	const displayPath = useMemo(() => {
		if (!sessionPath) {
			return null;
		}
		const relative = path.relative(cwd, sessionPath);
		if (!relative.startsWith('..') && !path.isAbsolute(relative)) {
			return `./${relative}`;
		}
		return sessionPath;
	}, [cwd, sessionPath]);

	const marginBottom = isDense ? 0 : 1;

	return (
		<Box flexDirection="column" flexGrow={1} paddingLeft={1}>
			<Box marginBottom={marginBottom}>
				<Text bold underline color="cyan">Configuration</Text>
			</Box>

			<Box marginBottom={marginBottom}>
				<Box width={20}>
					<Text>Model:</Text>
				</Box>
				<Text>{model}</Text>
			</Box>
			<Box marginBottom={marginBottom}>
				<Box width={20}>
					<Text>Compaction Model:</Text>
				</Box>
				<Text>{compactionModel}</Text>
			</Box>
			{displayPath && (
				<Box marginBottom={marginBottom}>
					<Box width={20}>
						<Text>Session Path:</Text>
					</Box>
					<Text>{displayPath}</Text>
				</Box>
			)}
			<Box marginBottom={marginBottom}>
				<Box width={20}>
					<Text>Flex Tier:</Text>
				</Box>
				<Text>{useFlexTier ? 'Yes' : 'No'}</Text>
			</Box>
			<Box marginBottom={marginBottom}>
				<Box width={20}>
					<Text>Current Turn:</Text>
				</Box>
				<Text>{currentTurn} / {maxTurns}</Text>
			</Box>
			<Box marginBottom={marginBottom}>
				<Box width={20}>
					<Text>Rate Limit @:</Text>
				</Box>
				<Text>{initialRateLimitThreshold}%</Text>
			</Box>
			{rateLimitStatus && rateLimitStatus.limitRequests !== null && (
				<Box marginBottom={marginBottom} flexDirection="column">
					<Box>
						<Box width={20}>
							<Text>RPM Limit:</Text>
						</Box>
						<Text>
							{rateLimitStatus.remainingRequests} / {rateLimitStatus.limitRequests} (Reset:{' '}
							{rateLimitStatus.resetRequests})
						</Text>
					</Box>
					<Box>
						<Box width={20}>
							<Text>TPM Limit:</Text>
						</Box>
						<Text>
							{rateLimitStatus.remainingTokens} / {rateLimitStatus.limitTokens} (Reset: {rateLimitStatus.resetTokens})
						</Text>
					</Box>
				</Box>
			)}
			{maxCost !== null && (
				<Box marginBottom={marginBottom}>
					<Box width={20}>
						<Text>Max Cost:</Text>
					</Box>
					<Text>${maxCost.toFixed(2)}</Text>
				</Box>
			)}

			<Box marginTop={1} flexDirection="column">
				<Text bold>Auto-approvals (up/down & space to toggle):</Text>
				{selectableOptions.map((option, index) => {
					const isSelected = index === selectedIndex && focusedArea === 'status';
					return (
						<Box key={option.label}>
							<Text color={isSelected ? 'cyan' : 'white'}>
								{isSelected ? '> ' : '  '}
								{option.label}
								{'isAction' in option ? '' : `: ${option.value ? 'ON' : 'OFF'}`}
							</Text>
						</Box>
					);
				})}
			</Box>
		</Box>
	);
}

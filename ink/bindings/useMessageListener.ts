import { globalPlanContext } from '../contexts/globalPlanContext';
import { curryEmitToListeners, emitToListeners, useListener } from '../emitters/listener';
import { sleep } from '../library/async/sleep';

let thoughtInterrupted = false;

async function streamAgentMessage(text: string) {
	emitToListeners('PushNewMessages', [{ type: 'agent', text: '' }]);
	const words = text.split(' ');
	for (let i = 0; i < words.length; i++) {
		if (thoughtInterrupted) {
			return;
		}
		emitToListeners('UpdateLastMessageText', words[i] + (i === words.length - 1 ? '' : ' '));
		await sleep(20 + Math.random() * words.length * 4);
	}
}

export function useMessageListener() {
	useListener('InterruptThought', () => {
		thoughtInterrupted = true;
		emitToListeners('SetInputMode', 'waiting');
		emitToListeners('PushNewMessages', [
			{ type: 'interrupted', text: '' },
		]);
	}, []);
	useListener('PushNewMessages', async (messages) => {
		for (const message of messages) {
			if (message.type === 'user' && message.text) {
				const lowerText = message.text.toLowerCase();

				if (lowerText === 'exit' || lowerText === 'bye') {
					emitToListeners('Exit', undefined);
					return;
				}

				emitToListeners('SetInputMode', 'thinking');

				await sleep((2000 * Math.random()) | 0);
				if (thoughtInterrupted) {
					thoughtInterrupted = false;
					return;
				}

				// goal
				if (lowerText.includes('goal')) {
					await streamAgentMessage('Goals are great! I got ours set up with some concrete plans to work through.');
					if (thoughtInterrupted) {
						thoughtInterrupted = false;
						return;
					}
					emitToListeners('SetGoal', 'Build a full agent terminal UI');
					emitToListeners('SetPlanItems', [
						{ id: 1, text: 'Design performant layout', completed: true },
						{ id: 2, text: 'Implement status pane', completed: true },
						{ id: 3, text: 'Add interactive input box', completed: true },
						{ id: 4, text: 'Simulate tool approvals', completed: false },
						{ id: 5, text: 'Optimize rendering', completed: false },
					]);

					emitToListeners('SetInputMode', 'waiting');
					return;
				}

				// run
				if (lowerText.includes('run')) {
					emitToListeners('SetInputMode', 'approving');
					await streamAgentMessage('I need to run a tool to continue. Do you approve?');
					if (thoughtInterrupted) {
						thoughtInterrupted = false;
						return;
					}
					emitToListeners('PushNewMessages', [
						{
							type: 'tool',
							text: 'list_files',
							args: '{"recursive": true, "path": "src"}',
						},
					]);

					return;
				}

				// shell
				if (lowerText.includes('shell') || lowerText.includes('sh')) {
					await streamAgentMessage('Executing some shell commands...');
					if (thoughtInterrupted) {
						thoughtInterrupted = false;
						return;
					}

					emitToListeners('AddShellCommand', {
						command: 'npm install',
						args: 'ink-tab ink-task-list',
						running: true,
					});

					await sleep(2000);
					if (thoughtInterrupted) {
						thoughtInterrupted = false;
						return;
					}

					emitToListeners('UpdateShellCommand', {
						id: 0,
						running: false,
						exitCode: 0,
					});

					emitToListeners('AddShellCommand', {
						command: 'ls -R',
						args: 'src/components',
						running: true,
					});

					await sleep(1500);
					if (thoughtInterrupted) {
						thoughtInterrupted = false;
						return;
					}

					emitToListeners('UpdateShellCommand', {
						id: 1,
						running: false,
						exitCode: 1,
					});

					emitToListeners('AddShellCommand', {
						command: 'echo',
						args: '"Hello from ShellView!"',
						running: false,
						exitCode: 0,
					});

					emitToListeners('SetInputMode', 'waiting');
					return;
				}

				// approve or yes
				if (lowerText.includes('approve') || lowerText.includes('yes')) {
					emitToListeners('SetInputMode', 'approved');
					setTimeout(curryEmitToListeners('SetInputMode', 'waiting'), 2000);

					await streamAgentMessage('Thank you. I am proceeding with the task.');
					if (thoughtInterrupted) {
						thoughtInterrupted = false;
						return;
					}
					emitToListeners(
						'SetPlanItems',
						globalPlanContext
							.planItems
							.map(item => (item.id === 4 ? { ...item, completed: true } : item)),
					);

					return;
				}

				// deny or no
				if (lowerText.includes('deny') || lowerText.includes('no')) {
					emitToListeners('SetInputMode', 'denied');
					setTimeout(curryEmitToListeners('SetInputMode', 'waiting'), 2000);

					await streamAgentMessage('Understood. I will find another way.');
					if (thoughtInterrupted) {
						thoughtInterrupted = false;
						return;
					}

					return;
				}

				// done or finish
				if (lowerText.includes('done') || lowerText.includes('finish')) {
					emitToListeners(
						'SetPlanItems',
						globalPlanContext
							.planItems
							.map(item => (item.id === 5 ? { ...item, completed: true } : item)),
					);
					await streamAgentMessage('Everything is complete!');
					if (thoughtInterrupted) {
						thoughtInterrupted = false;
						return;
					}

					emitToListeners('SetInputMode', 'approved');
					setTimeout(curryEmitToListeners('SetInputMode', 'waiting'), 2000);
					return;
				}
			}
		}
	}, []);
}

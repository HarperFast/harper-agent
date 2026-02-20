import { agentManager } from '../../agent/AgentManager';
import { handleExit } from '../../lifecycle/handleExit';
import { useChat } from '../contexts/ChatContext';
import { emitToListeners, useListener } from '../emitters/listener';

let hasShownInterruptHint = false;

export function useMessageListener() {
	const { userInputMode, isThinking } = useChat();

	useListener('InterruptThought', () => {
		agentManager.interrupt();
		emitToListeners('PushNewMessages', [
			{
				id: Date.now(),
				type: 'interrupted',
				text: '- thought interrupted -',
				version: 1,
			},
		]);
	}, []);

	useListener('PushNewMessages', async (messages) => {
		for (const message of messages) {
			if (message.type === 'user' && message.text) {
				const lowerText = message.text.toLowerCase();

				if (lowerText === 'exit' || lowerText === 'bye') {
					await handleExit();
				}

				// If we're currently thinking, enqueue the message to be processed on the next turn
				// and mark it handled so it doesn't trigger duplicate runs later.
				if (isThinking) {
					if (!hasShownInterruptHint) {
						hasShownInterruptHint = true;
						emitToListeners('PushNewMessages', [{
							type: 'interrupted',
							text: '- to interrupt the current thinking, press escape -',
							version: 1,
						}]);
					}
					agentManager.enqueueUserInput(message.text);
					message.handled = true;
				} else if (!message.handled) {
					void agentManager.runTask(message.text);
				}
			}
		}
	}, [userInputMode, isThinking]);
}

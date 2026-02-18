import { agentManager } from '../../agent/AgentManager';
import { handleExit } from '../../lifecycle/handleExit';
import { useChat } from '../contexts/ChatContext';
import { useListener } from '../emitters/listener';

export function useMessageListener() {
	const { userInputMode } = useChat();

	useListener('InterruptThought', () => {
		agentManager.interrupt();
	}, []);

	useListener('PushNewMessages', async (messages) => {
		for (const message of messages) {
			if (message.type === 'user' && message.text) {
				const lowerText = message.text.toLowerCase();

				if (lowerText === 'exit' || lowerText === 'bye') {
					await handleExit();
				}

				if (userInputMode === 'waiting' && !message.handled) {
					void agentManager.runTask(message.text);
				}
				// TODO: Build up the messages they send while we are thinking?
			}
		}
	}, [userInputMode]);
}

import { agentManager } from '../../agent/AgentManager';
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
					process.exit(0);
				}

				if (userInputMode === 'approving') {
					if (lowerText.includes('approve') || lowerText.includes('yes') || lowerText === 'y') {
						agentManager.handleApproval(true);
					} else if (lowerText.includes('deny') || lowerText.includes('no') || lowerText === 'n') {
						agentManager.handleApproval(false);
					}
					return;
				}

				if (userInputMode === 'waiting') {
					agentManager.runTask(message.text);
				}
			}
		}
	}, [userInputMode]);
}

import { fetchOllamaModels } from './fetchOllamaModels';
import { pullOllamaModel, type PullProgress } from './pullOllamaModel';

export async function ensureOllamaModel(
	modelName: string,
	onProgress?: (progress: PullProgress) => void,
): Promise<void> {
	const models = await fetchOllamaModels();
	if (!models.includes(modelName)) {
		await pullOllamaModel(modelName, onProgress);
	}
}

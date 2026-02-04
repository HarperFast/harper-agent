// Lightweight model context limit mapper. Values are conservative defaults.
// When exact limits are unknown, we pick a safe fallback to avoid overfilling.

export function getModelContextLimit(modelName: string | undefined | null): number {
	if (!modelName) { return DEFAULT_LIMIT; }
	const name = modelName.toLowerCase();

	// OpenAI (fallbacks for non-OpenAI path if ever used here)
	if (name.startsWith('gpt-4o') || name.startsWith('gpt-5')) { return 200_000; // typical 128k–200k; be safe
	 }
	if (name.startsWith('gpt-4')) { return 128_000; }

	// Anthropic
	if (name.startsWith('claude-3.5') || name.startsWith('claude-3')) { return 200_000; }

	// Google Gemini
	if (name.startsWith('gemini-1.5')) { return 1_000_000; // generous default for 1.5
	 }
	if (name.startsWith('gemini-')) { return 128_000; }

	// Ollama/local models often default to 4k–8k; use 8k as safe default
	if (name.startsWith('ollama-')) { return 8_000; }

	return DEFAULT_LIMIT;
}

export function getCompactionTriggerTokens(modelName: string | undefined | null, fraction = 0.8): number {
	const limit = getModelContextLimit(modelName);
	// Keep a healthy buffer to avoid provider-side rejections
	const f = Math.min(Math.max(fraction, 0.5), 0.95);
	return Math.floor(limit * f);
}

const DEFAULT_LIMIT = 128_000;

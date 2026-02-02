export async function getLatestVersion(packageName: string) {
	try {
		const response = await fetch(`https://registry.npmjs.org/${packageName}/latest`, {
			signal: (AbortSignal as any).timeout(1000), // 1 second timeout
		});
		if (!response.ok) {
			return null;
		}
		const data = await response.json();
		return data.version;
	} catch {
		return null;
	}
}

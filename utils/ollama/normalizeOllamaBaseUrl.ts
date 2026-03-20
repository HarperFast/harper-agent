export function normalizeOllamaBaseUrl(baseUrl: string): string {
	let url = baseUrl.trim();
	if (!url.startsWith('http://') && !url.startsWith('https://')) {
		url = `http://${url}`;
	}

	const urlObj = new URL(url);
	if (!urlObj.port) {
		urlObj.port = '11434';
	}

	let pathname = urlObj.pathname;
	if (pathname.endsWith('/')) {
		pathname = pathname.slice(0, -1);
	}

	if (!pathname.endsWith('/api')) {
		pathname += '/api';
	}

	urlObj.pathname = pathname;

	return urlObj.toString().replace(/\/$/, '');
}

export function wrapText(text: string, width: number): string[] {
	if (width <= 1) { return text ? [text] : ['']; }
	const hardLines = text.split('\n');
	const allWrappedLines: string[] = [];

	for (const hardLine of hardLines) {
		if (hardLine.length === 0) {
			allWrappedLines.push('');
			continue;
		}

		const words = hardLine.split(/(\s+)/);
		let currentLine = '';
		for (const token of words) {
			if (token.length === 0) { continue; }
			if (currentLine.length + token.length <= width) {
				currentLine += token;
			} else {
				if (currentLine) { allWrappedLines.push(currentLine.trimEnd()); }
				if (token.trim().length === 0) {
					// Skip leading whitespace on subsequent wrapped lines
					currentLine = '';
				} else if (token.length > width) {
					// hard wrap very long token
					for (let i = 0; i < token.length; i += width) {
						const chunk = token.slice(i, i + width);
						if (chunk.length === width) {
							allWrappedLines.push(chunk);
						} else {
							currentLine = chunk;
						}
					}
				} else {
					currentLine = token;
				}
			}
		}
		if (currentLine) { allWrappedLines.push(currentLine.trimEnd()); }
	}
	return allWrappedLines.length ? allWrappedLines : [''];
}

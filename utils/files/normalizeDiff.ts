/**
 * Normalizes a diff by removing common headers and footers that some models include.
 * @param diff The raw diff string.
 * @returns The normalized diff string.
 */
export function normalizeDiff(diff: string): string {
	return diff
		.split(/\r?\n/)
		.filter((line) => {
			const l = line.trim();
			return (
				!l.startsWith('*** Begin Patch')
				&& !l.startsWith('*** End Patch')
				&& !l.startsWith('*** Add File:')
				&& !l.startsWith('*** Update File:')
				&& !l.startsWith('*** Delete File:')
				&& !l.startsWith('*** End of File')
			);
		})
		.join('\n')
		.trim();
}

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
			// Strip common patch wrappers and metadata lines models may include
			if (
				l.startsWith('*** Begin Patch')
				|| l.startsWith('*** End Patch')
				|| l.startsWith('*** Add File:')
				|| l.startsWith('*** Update File:')
				|| l.startsWith('*** Delete File:')
				|| l.startsWith('*** End of File')
			) {
				return false;
			}
			// Also strip lowercase operation headers sometimes emitted
			if (
				l.startsWith('update_file:')
				|| l.startsWith('create_file:')
				|| l.startsWith('delete_file:')
			) {
				return false;
			}
			return true;
		})
		.join('\n')
		.trim();
}

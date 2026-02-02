import { describe, expect, it } from 'vitest';
import { normalizeDiff } from './normalizeDiff';

describe('normalizeDiff', () => {
	it('should remove *** Begin Patch and *** End Patch', () => {
		const diff = `*** Begin Patch
+line 1
+line 2
*** End Patch`;
		expect(normalizeDiff(diff)).toBe('+line 1\n+line 2');
	});

	it('should remove *** Add File: header', () => {
		const diff = `*** Add File: poem.txt
+line 1`;
		expect(normalizeDiff(diff)).toBe('+line 1');
	});

	it('should remove *** Update File: header', () => {
		const diff = `*** Update File: poem.txt
@@
-old
+new`;
		expect(normalizeDiff(diff)).toBe('@@\n-old\n+new');
	});

	it('should handle complex mixed headers', () => {
		const diff = `*** Begin Patch
*** Add File: poem.txt
+line 1
*** End Patch`;
		expect(normalizeDiff(diff)).toBe('+line 1');
	});

	it('should preserve indentation in non-header lines', () => {
		const diff = `*** Begin Patch
+ line with space
+	line with tab
*** End Patch`;
		expect(normalizeDiff(diff)).toBe('+ line with space\n+	line with tab');
	});

	it('should remove *** End of File', () => {
		const diff = `+line 1
*** End of File`;
		expect(normalizeDiff(diff)).toBe('+line 1');
	});

	it('should NOT remove lines starting with +***', () => {
		const diff = `+*** Begin Patch
+Actual content`;
		expect(normalizeDiff(diff)).toBe('+*** Begin Patch\n+Actual content');
	});
});

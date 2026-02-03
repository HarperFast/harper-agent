import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['test.e2e/**/*.e2e.ts'],
		exclude: ['**/node_modules/**', '**/.git/**'],
		testTimeout: 10 * 60_000,
		hookTimeout: 60_000,
		reporters: 'default',
		maxConcurrency: 1,
		slowTestThreshold: 60_000,
	},
});

import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './tests',
	testMatch: 'idb-cache.spec.ts',
	timeout: 30000,
	use: {
		baseURL: 'http://localhost:5173',
		headless: true,
	},
	webServer: {
		command: 'npm run dev',
		port: 5173,
		reuseExistingServer: true,
	},
});

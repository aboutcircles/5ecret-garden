import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './tests',
	testMatch: ['idb-cache.spec.ts', 'idb-e2e.spec.ts'],
	timeout: 60000,
	use: {
		baseURL: 'http://localhost:5173',
		headless: true,
		channel: 'chromium',
		launchOptions: {
			executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
		},
	},
	webServer: {
		command: 'npm run dev',
		port: 5173,
		reuseExistingServer: true,
	},
});

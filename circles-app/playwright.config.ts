import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	timeout: 60_000,
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? 'github' : 'html',
	use: {
		baseURL: 'http://localhost:5173',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
	},
	projects: [
		{
			name: 'e2e',
			testDir: './e2e',
			use: { ...devices['Desktop Chrome'] },
		},
		{
			name: 'idb',
			testDir: './tests',
			testMatch: ['idb-cache.spec.ts', 'idb-e2e.spec.ts'],
			use: {
				channel: 'chromium',
				launchOptions: {
					executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
				},
			},
		},
	],
	webServer: {
		command: 'npm run dev',
		port: 5173,
		reuseExistingServer: !process.env.CI,
	},
});

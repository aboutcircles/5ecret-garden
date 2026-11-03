import { defineConfig, devices } from '@playwright/test';

// SECURITY: local runs drive the installed Google Chrome with its sandbox on,
// unless PLAYWRIGHT_USE_INSTALLED_CHROME=0. Playwright's pinned Chromium trails
// Chrome security releases and starts with --no-sandbox, so a hostile page could
// run code on the developer's machine. On by default so a hand-typed
// `playwright test` is covered; the npm scripts also set it, to say so. CI keeps
// the bundled browser, so a CI result never depends on a runner's Chrome.
const installedChrome =
	process.env.PLAYWRIGHT_USE_INSTALLED_CHROME !== '0' && !process.env.CI
		? { channel: 'chrome', launchOptions: { chromiumSandbox: true } }
		: {};

export default defineConfig({
	timeout: 60_000,
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? 'github' : 'html',
	use: {
		...installedChrome,
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
				// Its own launchOptions replace the top-level ones, so the sandbox is
				// asked for again here.
				launchOptions: {
					executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
					chromiumSandbox: true,
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

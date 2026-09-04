import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: 'html',
	use: {
		baseURL: 'http://127.0.0.1:4173',
		trace: 'on-first-retry',
		...devices['Desktop Chrome']
	},
	webServer: {
		command: 'pnpm dev --host 127.0.0.1 --port 4173',
		url: 'http://127.0.0.1:4173',
		reuseExistingServer: !process.env.CI,
		env: {
			...process.env,
			// Relaxes CSP for Vite's dev modules; production builds keep default-src none.
			E2E: '1'
		}
	}
});

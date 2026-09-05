import { defineConfig, devices } from '@playwright/test';
import { e2eDevOrigin } from './scripts/e2e-dev-server.mjs';

export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: 'html',
	use: {
		baseURL: e2eDevOrigin,
		trace: 'on-first-retry',
		...devices['Desktop Chrome']
	},
	webServer: {
		// Always start through the helper so a stale leftover Vite (wrong CSP, broken HMR)
		// is replaced instead of reused just because the port still answers.
		command: 'node ./scripts/e2e-dev-server.mjs',
		url: e2eDevOrigin,
		reuseExistingServer: false,
		timeout: 120_000,
		env: {
			...process.env,
			// Relaxes CSP for Vite's dev modules; production builds keep default-src none.
			E2E: '1'
		}
	}
});

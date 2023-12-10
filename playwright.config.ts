import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
	testDir: './src/tests',
	outputDir: './src/tests/test-results',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: 'null',
	timeout: 3000,
	use: {
		baseURL: 'http://127.0.0.1:5500/release/online/index.html',
		trace: 'on-first-retry',
	},
	webServer: {
		command: 'python -m http.server 5500',
		url: 'http://localhost:5500/release/online/index.html',
		reuseExistingServer: !process.env.CI,
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
		// {
		// 	name: 'firefox',
		// 	use: { ...devices['Desktop Firefox'] },
		// },
		// {
		// 	name: 'webkit',
		// 	use: { ...devices['Desktop Safari'] },
		// },
		// {
		//   name: 'Mobile Chrome',
		//   use: { ...devices['Pixel 5'] },
		// },
		// {
		//   name: 'Mobile Safari',
		//   use: { ...devices['iPhone 12'] },
		// },
		// {
		//   name: 'Microsoft Edge',
		//   use: { ...devices['Desktop Edge'], channel: 'msedge' },
		// },
		// {
		//   name: 'Google Chrome',
		//   use: { ..devices['Desktop Chrome'], channel: 'chrome' },
		// },
	],
})

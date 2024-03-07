import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
	testDir: './',
	preserveOutput: 'never',
	reporter: 'null',
	timeout: 10000,
	use: {
		baseURL: 'http://127.0.0.1:8080/index.html',
	},
	webServer: [
		{
			command: 'http-server ../release/online',
			reuseExistingServer: !process.env.CI,
		},
		{
			command: 'wrangler dev --ip=127.0.0.1',
			reuseExistingServer: !process.env.CI,
		},
	],
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

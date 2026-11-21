import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30000,
  fullyParallel: false,
  use: { baseURL: 'http://localhost:4174', ...devices['iPhone 13'], browserName: 'chromium', trace: 'off' },
  webServer: { command: 'npx vite build && npx vite preview --port 4174 --strictPort', port: 4174, reuseExistingServer: true, timeout: 120000 },
});

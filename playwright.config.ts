import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30000,
  fullyParallel: false,
  use: { baseURL: 'http://localhost:4174', ...devices['iPhone 13'], browserName: 'chromium', trace: 'off' },
  webServer: { command: 'VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npx vite build --outDir dist-e2e && npx vite preview --port 4174 --strictPort --outDir dist-e2e', port: 4174, reuseExistingServer: true, timeout: 120000 },
});

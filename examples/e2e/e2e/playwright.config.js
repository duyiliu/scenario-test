import { defineConfig } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
process.env.E2E_RUN_ID ||= randomUUID();
const root = import.meta.dirname;
export default defineConfig({
  testDir: './tests', timeout: 45000, workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: path.join(root, '../e2e-results', process.env.E2E_RUN_ID, 'report') }], ['../.scenario-test/e2e-reporter.cjs']],
  use: { baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:4303/demo-app/', channel: process.env.E2E_BROWSER_CHANNEL || 'chrome', screenshot: 'only-on-failure', trace: 'retain-on-failure' }
});

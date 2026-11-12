import { defineConfig } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
process.env.E2E_RUN_ID ||= randomUUID();
const root = import.meta.dirname;
const reporters = [['list'], ['html', { open: 'never', outputFolder: path.join(root, '../e2e-results', process.env.E2E_RUN_ID, 'report') }]];
if (process.env.SCENARIO_TEST_E2E_REPORTER) reporters.push([process.env.SCENARIO_TEST_E2E_REPORTER]);
export default defineConfig({
  testDir: './tests', timeout: 45000, workers: 1,
  reporter: reporters,
  use: { baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:4303/demo-app/', channel: process.env.E2E_BROWSER_CHANNEL || 'chrome', screenshot: 'only-on-failure', trace: 'retain-on-failure' }
});

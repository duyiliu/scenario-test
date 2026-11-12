import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:18083' }
});

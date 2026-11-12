import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// 前端端口与后端 API 端口分离，经 vite 代理 /api——真实项目最常见的形态。
const frontendPort = Number(process.env.PORT || 18085);
const backendPort = Number(process.env.API_PORT || 18084);

export default defineConfig({
  plugins: [vue()],
  server: {
    port: frontendPort,
    strictPort: true,
    proxy: { '/api': `http://127.0.0.1:${backendPort}` }
  },
  preview: {
    port: frontendPort,
    strictPort: true,
    proxy: { '/api': `http://127.0.0.1:${backendPort}` }
  }
});

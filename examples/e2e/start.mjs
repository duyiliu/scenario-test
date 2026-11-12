import path from 'node:path';
import { createServeServer } from '../../src/cli/serve-server.js';
import { createE2eExtension } from '../../src/e2e/extension.js';
import demo from './serve-extensions/demo.mjs';

const workspace = import.meta.dirname;
const port = Number(process.env.SCENARIO_TEST_DEMO_PORT || 4303);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('演示端口无效');
process.env.E2E_BASE_URL = `http://127.0.0.1:${port}/demo-app/`;
process.env.E2E_BROWSER_CHANNEL ||= 'chrome';
// reporter 由 serve 启动 playwright 时经 SCENARIO_TEST_E2E_REPORTER 物化注入，无需手写进项目
const server = createServeServer({
  workspace, port, libraryDist: path.resolve(workspace, '../../dist'),
  extensions: [createE2eExtension({ workspace }), demo]
});
server.on('error', error => { console.error(`框架测试工作台启动失败：${error.message}`); process.exitCode = 1; });
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  try { await server.disposeExtensions(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { server.closeAllConnections(); server.close(); }
}
process.once('SIGINT', close);
process.once('SIGTERM', close);
server.listen(port, '127.0.0.1', () => {
  console.log(`框架测试工作台：http://127.0.0.1:${port}/`);
  console.log(`浏览器 E2E：http://127.0.0.1:${port}/e2e/`);
  console.log(`本地模拟页面：${process.env.E2E_BASE_URL}`);
  console.log(`工作区：${workspace}\n仅启动服务，不自动执行测试。`);
});

# Vue + Playwright E2E 最小示例

这是 scenario-test 仓库中的**独立演示业务项目**，用于验证原生 Playwright Test。
不会修改现有 HTTP Runner、DSL、工作台或 Skill，也不代表 E2E 已集成到 scenario-test CLI。

## 目录

- `src/App.vue`：内存中的任务创建与列表界面（没有后端）。
- `scenario-test/e2e/playwright.config.ts`：独立 Playwright 配置，`E2E_BASE_URL` 可覆盖默认地址。
- `scenario-test/e2e/tests/task-create.spec.ts`：创建任务并验证列表中的业务结果。

## 本地运行（Node.js 22+）

在本目录执行：

```bash
npm install
npx playwright install chromium
npm run dev
```

保持前端服务运行，在另一个终端进入**同一目录**：

```bash
npm run test:e2e
```

连续重复三次验证稳定性：

```bash
npm run test:e2e && npm run test:e2e && npm run test:e2e
```

使用不同端口或远程可达的测试服务时，请设置 `E2E_BASE_URL` 再运行，例如：

```bash
E2E_BASE_URL=http://127.0.0.1:5174 npm run test:e2e
```

PowerShell：`$env:E2E_BASE_URL='http://127.0.0.1:5174'; npm run test:e2e`。

不自动启动服务，避免测试访问未经确认的目标；本示例无账号、无真实业务数据。
失败截图与 Trace 存放在 `scenario-test/e2e/test-results/`，HTML 报告位于 `scenario-test/e2e/playwright-report/`，已通过 .gitignore 排除。

## 后续验收

这只是 **手写的基线样例**，用来验证运行环境、浏览器执行与业务断言。
下一阶段应在此样例上验证 AI 读取 Vue 代码后生成等价的 Playwright 用例，而不是直接把现有样例当作 AI 自动生成能力已经实现。

本 PR 只提交示例和测试代码，未在本对话环境安装浏览器或实际执行测试；合并前应在本地或 CI 运行以上命令。

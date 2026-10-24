# CLAUDE.md

本文件为 Claude Code（claude.ai/code）在本仓库中工作时提供指引。

## 项目简介

`@yc_yzkj/scenario-test` 是一个可复用的 HTTP 场景测试库。它提供声明式 DSL 来描述 HTTP 场景（变量、提取、断言、条件、重试），并附带浏览器工作台和一个 Node.js CLI，二者运行同一套场景。消费方通常**不经 npm 集成**：安装脚本下载固定版本的 tarball，并在各项目内初始化一个包含运行时副本的 `scenario-test/` 目录，因此本仓库的 `dist/` 才是业务项目真正消费的产物。

本仓库的注释、文档和用户可见消息大多使用**中文**。编写代码注释或 CLI/UI 文案时请保持一致。

## 常用命令

构建/测试要求 Node.js 20.11+（`import.meta.dirname` 自 20.11 可用；Tailwind CSS 4 的 oxide 要求 20+）；业务项目运行时消费仍为 Node.js 18+。`test:coverage` 使用 Node.js 22.8+ 的内置覆盖率过滤与阈值参数。

```bash
npm run build          # 重建 dist/ 与生成文件（esbuild + generate-dts + tailwind v4）
npm run dev            # 监听 src/，自动重建 dist/，并在 http://127.0.0.1:4300/ 提供示例页面
npm test               # 仅 Node 单元/集成测试（.test.js 与 *.unit.test.mjs）
npm run test:unit      # 同上，显式入口
npm run test:browser   # Playwright 浏览器测试（tests/browser.test.mjs）
npm run test:ui-style  # Playwright 样式测试（tests/ui-style.test.mjs）
npm run test:all       # 单元 + 浏览器 + 样式全量
npm run test:coverage  # 仅统计 src/，line 90% / branch 80% 阈值；当前按预期失败
npm run check:coverage # 实际执行 test:coverage，确认仅报告 src/ 且因阈值不足失败
npm run check          # npm run build && test:unit && check:coverage（快速门禁）
npm run check:all      # npm run build && test:all && check:coverage（完整门禁，CI 使用）
```

`npm test` / `npm run check` 只跑 Node 单元测试，**不会**执行 `.mjs` 浏览器用例；完整验证必须用 `npm run check:all`（CI 已按此执行）。新增可独立运行的 Node `.mjs` 单测请命名为 `*.unit.test.mjs`，浏览器用例继续走 `test:browser` / `test:ui-style`。
`test:coverage` 仅统计 `src/`，当前会因 `cli.js`（#33）与浏览器 UI（由 Playwright 覆盖）低于 line 阈值而失败，属已知缺口，不等同于全量测试失败；`check` / `check:all` 会通过 `check:coverage` 再跑一次完整覆盖率命令，确认报告范围与预期失败原因。

测试使用 Node 内置的 `node:test` 运行器，从 `src/`（源码，而非 `dist/`）导入。运行单个文件或单个用例：

```bash
node --test tests/engine.test.js
node --test --test-name-pattern="默认失败停止" tests/engine.test.js
```

公开 CLI 为 `dist/scenario-test-cli.cjs`（由 `src/cli.js` 构建）。子命令：`run`、`serve`、`init`、`capabilities`、`doctor`。选项见 `--help`。

## 架构

核心思想：**`src/contract.js` 是 DSL 的唯一事实来源。** 它声明操作符列表、断言元键、`when`/`extract` 来源、保留变量、`generatedVars` 类型、globals 类型、config/scenario/scenario-step 键列表以及 CLI 选项。所有对外投射 DSL 的模块都从 `contract` 读取——`capabilities.js` → `dist/scenario-test-capabilities.json` 与 `capabilities` 命令；`scripts/generate-dts.mjs` → `dist/scenario-test.d.ts`；`init-templates.js` → AI 提示词 / 模式 / 项目 README；`doctor.js` → 其 DSL 检查。**切勿手写任何操作符/键列表的第二份副本**——构建与测试会校验一致性（`tests/contract.test.js`、`tests/dts.test.js`）。契约一经发布即不可变；新增能力时递增 `contractVersion` 并保留旧字段。

运行时分层：

- **`core.js`** — 与环境无关的纯函数：`{{vars.*}}` 模板解析（`resolve`/`resolveString`/`evalExpression`）、断言（`evaluateAssertion`/`buildAssertions`）、提取（`applyExtract`）、`md5`/`generateSignature`、URL 构建、响应体解析。无 I/O。
- **`registry.js`** — 定义期校验（`defineScenario`、`defineConfig`、`registerScenario`、`registerConfig`、`registerAdapter`）。快速失败，报错信息带场景/步骤/断言编号。
- **`engine.js`** — 执行：`createEngine` → `runScenario` → `runStep`。处理 retryUntil、每步骤 `timeoutMs`、取消/超时语义（结构化 `scenarioTimedOut`/`scenarioContext` 标记，而非本地化消息匹配）、适配器分发，以及将 `extract` 写入 `runtime.vars`。
- **`adapter-types.js`** — 校验适配器协议（必需 `execute`；可选 `initialize`/`matches`/`beforeExecute`/`afterExecute`/`onError`/`dispose`）。

按目标环境的入口：

- `index.js`（浏览器 + 中性环境）重新导出公共 API；`node.js` 增加仅 Node 的 `createNodeIo`、`loadConfigFile`、`loadScenarioFile`；`cli.js` 为 CLI。
- **`browser/`** — 工作台。`app.js`（`createApp`）委托给 `browser/ui/runtime.js`（`createWorkbenchRuntime`），后者是**同一套** `engine.js` + `core.js` 之上的薄 UI 层。`tests/parity.test.js` 保证浏览器与引擎保持同步。`browser/tailwind.generated.js` 中的 Tailwind CSS 由 `ui/ui-view.js`、`ui-adhoc.js`、`runtime.js` 生成。

值得内化的执行模型：

- 场景/配置文件是**可执行代码**，运行在 `node:vm` 沙箱（`node/loader.js`）中，全局暴露 `ScenarioTest`。场景文件必须调用 `ScenarioTest.registerScenario(id, ScenarioTest.defineScenario({...}))`；配置文件调用 `ScenarioTest.registerConfig(ScenarioTest.defineConfig({...}))`。配置中场景列表的 `id` **必须等于**该文件注册的 `id`。
- `node/io.js` 实现 `fileUpload`（FormData）与 `saveResponseAs`，二者均受 `utils/path-validator.js`（路径穿越防护）约束，保证写入不超出配置工作区。
- `init`（`cli.js` 的 `initCommand` + `init-templates.js`）写出一个自包含项目：模板在 `scenario-test/` 下，运行时副本在 `scenario-test/.scenario-test/` 下（`project-layout.js` 定义 `FRAMEWORK_FILES`）。`init` 记录一个含 SHA256 哈希的 `.scenario-test-version.json` 锁文件；`doctor` 用它检测被篡改或过期的运行时副本。
- `serve` 是静态服务器 + 同源代理：向 HTML 注入 `window.__SCENARIO_TEST_SERVE_PROXY__`，将未匹配的请求转发到所选环境的 `baseUrl`，并剥离逐跳（hop-by-hop）头，使工作台无需 CORS。

## 生成文件——请勿手改

以下文件由 `npm run build`（经 `scripts/build.mjs` / `scripts/generate-dts.mjs`）生成，切勿直接编辑：

- `src/version.generated.js`（来自 `package.json` 的版本号）
- `src/browser/tailwind.generated.js`
- `dist/*`（umd/esm/cjs/cli/d.ts/capabilities.json）——`dist/` 已提交并随 npm tarball 发布
- `dist/scenario-test-capabilities.json` 与 `dist/scenario-test.d.ts`（`contract.js` 的投射）

若修改了 `package.json` 的版本号或 DSL，请运行 `npm run build` 以一致地重新生成。

## 发版

`master` 只保留可发布的代码；`dist/` 已提交。升级版本意味着更新 `package.json`、`package-lock.json`、`CHANGELOG.md`、`scripts/install.ps1`/`install.sh` 中固定的版本号/tarball URL，以及 `README.md`/`docs/AI_SCENARIO_PROMPT.md` 中的 jsDelivr 安装 URL，然后执行 `npm run check:all`，打 tag `vX.Y.Z`，再 `npm publish`。完整步骤见 `docs/RELEASING.md`。

# 前端 E2E 测试 MVP 设计（提案）

> 状态：设计提案，尚未实现。目标是在现有 HTTP 场景测试能力之外，以最小改动验证「AI 生成原生 Playwright E2E 测试并执行」的闭环。

## 目标与边界

用户指定一个**前端业务功能**（例如登录或订单创建），Agent 阅读相关页面、路由和必要的接口代码，生成标准 Playwright Test 用例，在**用户明确要求执行且确认目标环境后**运行，并返回断言结果、截图、Trace 等证据。

MVP 只覆盖一个业务流程，不承诺批量覆盖率或稳定性自修复。

- **保留**已有 HTTP DSL、`scenario.config.js`、`scenarios/`、Node CLI 和工作台行为。
- **新增**独立的 `e2e/` 用例区域；测试代码直接使用 Playwright Test API，不创建第二套 DSL。
- **不做** HTTP/E2E 混合调度、统一报告、E2E 工作台、录制回放、全量覆盖率、多浏览器矩阵、自动改业务代码。
- E2E 运行不通过现有 `scenario-test run`；它仍只运行 HTTP 场景。

## 业务项目目录约定

以下是**业务项目接入后的目录**，不是本工具源码仓库的目录：

```text
business-project/
├── src/
└── scenario-test/
    ├── .scenario-test/            # 已有：固定版本 HTTP 运行时和 AI 规则
    ├── scenarios/                 # 已有：HTTP DSL 场景
    ├── scenario.config.js         # 已有：HTTP 环境与场景清单
    ├── index.html                 # 已有：HTTP 工作台
    ├── start-scenario-test.cmd    # 已有：Windows 启动入口
    └── e2e/                       # 新增：前端 E2E；不由现有 init 自动生成
        ├── playwright.config.ts  # 独立 Playwright 配置
        └── tests/
            └── login.spec.ts     # AI 生成的原生 Playwright 用例
```

`e2e/` 随业务项目版本控制；真实密码、浏览器状态、Trace、截图、HTML 报告不提交。生成时应补充相应的 `.gitignore` 规则（如 `test-results/`、`playwright-report/`），避免产生敏感运行证据。

## 前端地址配置

HTTP 的 `envs[].baseUrl` 与前端浏览器地址含义不同，MVP **不复用或改写** `scenario.config.js`。E2E 使用独立环境变量 `E2E_BASE_URL`，默认只用于本机开发：

```ts
// scenario-test/e2e/playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:5173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  reporter: 'html',
});
```

`5173` **仅为 Vite 项目的示例值**；生成前先根据业务项目已有配置或用户提供的信息确定真实地址，不应假定所有项目都使用该端口。优先由环境变量覆盖；不把内网/生产 URL、账号密码写死在测试代码里。前端服务由用户或已有工具启动，第一版不引入 Playwright `webServer` 自动启动。

## 执行环境与依赖

- Playwright Test 和 Chromium 由**独立的 E2E 测试执行环境**提供；业务应用本身不必修改 `package.json`。
- 此仓库 `package.json` 中的 `playwright` 是**本仓库测试用开发依赖**，不能视作用户业务项目已经安装了 `@playwright/test`。
- 正式实现前，需确定并验证一条可复现的运行方式（执行环境、`@playwright/test` 版本、浏览器二进制安装与缓存、Windows/WSL 路径），避免通过临时 `npx` 隐式联网下载不受控版本。
- 在执行环境就绪后，从业务项目根目录指定配置运行，例如：
  `playwright test --config scenario-test/e2e/playwright.config.ts`。
  这里的 `playwright` 指**已配置好的测试执行环境提供的命令**，不是本仓库现有 HTTP CLI。

## Agent 的最小工作流

1. **确认目标**：只分析用户指定的一个功能、相关页面/路由/必要后端契约；确认项目根目录、前端 URL 和安全测试环境。
2. **生成**：创建 `scenario-test/e2e/playwright.config.ts`（不存在时）及一个 `tests/*.spec.ts`，使用标准 Playwright API。优先 `getByRole` / `getByLabel` 等语义定位器，使用自动等待，禁止无根据的固定 sleep。
3. **断言**：至少验证一项真实业务结果（例如登录后的目标页面/登录状态、创建成功的订单记录），不以「点击成功」作为通过条件。
4. **执行**：生成本身不访问页面或修改数据；只有用户明确要求运行并确认目标环境后才启动。真实写操作应使用可隔离的测试数据及清理策略。
5. **报告**：返回通过/失败、失败步骤、断言和证据路径；失败时保留截图/Trace。测试失败不得擅自修改业务代码以让测试通过。

现有 Skill 当前明确排除无关 E2E；实现阶段再增加**独立的 E2E 指导/意图路由**，不能让原 HTTP 规则误把 `.spec.ts` 当作 HTTP DSL，也不能因此改变 HTTP 自动初始化与执行的安全规则。

## MVP 验收

选择一个可控的演示业务项目和一个确定的流程，例如「打开登录页 → 输入测试账号 → 登录 → 验证登录后的业务状态」。

- AI 能依据真实业务代码生成一份可读、可维护的原生 `.spec.ts`。
- 测试在配置明确、依赖固定的环境中连续成功执行 **3 次**；不通过增加固定延时掩盖不稳定。
- 故意制造一次断言失败时，能定位测试失败并读取截图或 Trace。
- HTTP 场景目录和 `scenario-test run/serve/doctor` 行为不变。
- 整个过程不修改业务项目的 npm 依赖或发布构建配置，也不提交凭据与运行证据。

## 实施顺序（按最小增量）

1. **先验证运行环境**：在一个演示项目内手动建立 `e2e/`，固定 Playwright Test/Chromium 版本及独立启动命令，跑通一个真实用例。
2. **再扩展 Skill**：只增加目标识别、原生测试生成规范和执行授权约束；保留原 HTTP 工作流。
3. **最后评估集成**：确认复跑稳定后，再决定是否增加统一 CLI、工作台入口和跨类型场景清单；这些均不是本次 MVP 的交付范围。

**本提案仅是设计记录，不代表 E2E 功能已交付。**

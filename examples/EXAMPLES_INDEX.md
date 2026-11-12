# scenario-test 示例索引

本目录提供可独立阅读和运行的场景示例。业务项目接入请从根目录 [README](../README.md) 的“快速接入”开始，不需要复制示例目录。

## 业务项目快速开始

默认采用免 npm 接入，不修改业务项目依赖：

1. 按根目录 [README](../README.md) “快速接入”安装全局 Skill，在业务项目根目录打开 AI。
2. 提供要测试的业务功能，以及页面、Controller、接口或已有测试入口。
3. 项目未接入时，Skill 自动初始化并运行 `doctor`；通过后生成场景。
4. 确认目标环境和场景内容后，再明确要求运行测试或启动工作台。

项目内生成的 `scenario-test/.scenario-test/AI_SCENARIO_PROMPT.md` 是后续场景设计规则，无需复制规则。npm 仅在用户明确要求时作为可选安装方式；两种方式不混用、不自动切换。

> 示例目录只保留最小配置、场景与页面，**不含 `.scenario-test/` 运行时副本**。直接对示例运行 `doctor` 会提示缺少运行时与 AI 规则文件，这是预期；开发调试用 `npm run dev`，接入业务项目请按 README 执行安装或 `init`。

## 示例列表

### Basic：基础请求

路径：[`examples/basic/`](basic/)

覆盖：

- 健康检查；
- 慢响应处理；
- 清理操作；
- 最小 `scenario.config.js` 与浏览器入口。

适合首次了解配置、场景注册和基础断言。

### Complete：完整流程

路径：[`examples/complete/`](complete/)

覆盖：

- 本地 Mock API；
- 手动登录、Token 提取与后续认证；
- 重试和条件跳过；
- 浏览器工作台与 CLI 共用配置。

详细步骤见 [完整示例说明](complete/README.md)。

### Security Best Practices：安全实践

路径：[`examples/security-best-practices/`](security-best-practices/)

覆盖：

- 使用环境变量提供凭据；
- 路径安全校验；
- 错误信息遮蔽；
- 重试超时保护。

使用前请阅读 [安全指南](../SECURITY.md)。

### Tree Demo：多层目录

路径：[`examples/tree-demo/`](tree-demo/)

覆盖：

- 多级目录（`common` / `auth` / `order/refund` / `task`）；
- 工作台左侧目录树的层级、折叠与排序；
- 登录、订单、任务轮询等可执行场景。

详细步骤见 [多层目录示例说明](tree-demo/README.md)。

### E2E：浏览器端到端与统一工作台

路径：[`examples/e2e/`](e2e/)

覆盖：

- 统一工作台内 HTTP 场景与浏览器 E2E 同文档切换（`#http` / `#e2e&spec=...`）；
- 7 个 Playwright 用例：登录守卫、候诊筛选、状态过滤、空结果、页面结构、失败证据；
- 9 个接口场景与本地模拟 API（`/demo-api/*`），共用一份 `scenario.config.js`；
- 有头模式运行、按 runId 留存截图与报告。

它与前四个示例不同：需要 E2E 扩展端点、独立 Playwright 依赖与系统 Chrome，**必须单独启动**，`npm run dev` 只做静态预览、不提供该能力。详见 [E2E 示例说明](e2e/README.md)。

## 示例项目与测试夹具的分工

仓库里同时存在「可读示例」「自测工作台」与「容器夹具」三类项目，用途不同，不要混用：

| 位置 | 用途 | 启动 / 运行 |
| --- | --- | --- |
| `examples/basic`、`complete`、`security-best-practices`、`tree-demo` | 纯 HTTP 场景示例，静态页面 + 本地 Mock，dev 可直接预览 | `npm run dev` |
| `examples/e2e` | 框架自测工作台：HTTP + 浏览器 E2E 同文档，自带模拟页面与 API | `npm run demo:e2e`（端口 4303） |
| `tests/skill-e2e/` | Skill 接入链路的干净 Docker 夹具（Python / Java / web-static / web-vue3 / web-existing），需 Docker 与 pi | `bash tests/skill-e2e/docker/run-*-test.sh` |
| `tests/fixtures/` | 单元与回归用的确定性夹具（场景设计评估、浏览器综合用例等） | `node --test tests/*.test.js` |

`examples/` 面向读者，可以照着写；`tests/` 面向框架回归，目录形态不保证适合业务项目参考。

## 运行仓库内示例

仓库示例使用本地构建产物，适合公共库维护者。先按 [发布与构建说明](../docs/RELEASING.md) 完成依赖安装和构建。

```powershell
# Basic
node .\dist\scenario-test-cli.cjs `
  --config .\examples\basic\scenario.config.js --all

# Complete：先在一个终端启动 Mock API
node .\examples\complete\mock-server.cjs

# 再在另一个终端执行场景
node .\dist\scenario-test-cli.cjs `
  --config .\examples\complete\scenario.config.js --all
```

安全示例需要先提供演示环境变量，禁止填入生产凭据：

```powershell
$env:SCENARIO_AUTH = "Bearer demo-token"
$env:DEMO_API_KEY = "demo-key"
$env:DEMO_API_SECRET = "demo-secret"
node .\dist\scenario-test-cli.cjs `
  --config .\examples\security-best-practices\scenario.config.js --all
```

浏览器 E2E 示例独立启动（首次需安装示例自己的 Playwright 依赖）：

```powershell
npm install --prefix .\examples\e2e\e2e
npm run demo:e2e
```

- 统一工作台：`http://127.0.0.1:4303/`
- E2E 页签：`http://127.0.0.1:4303/e2e/`

## 如何选择

| 目标 | 示例 |
| --- | --- |
| 了解最小配置和基础请求 | Basic |
| 查看认证、多步骤编排和重试 | Complete |
| 检查凭据、路径与错误处理 | Security Best Practices |
| 验证场景目录树与多级目录 | Tree Demo |
| 验证浏览器行为（路由、DOM、截图） | E2E |

示例仅用于学习，不能直接作为生产测试配置。复制到业务项目后，需要重新确认环境地址、认证方式、请求字段、响应结构、测试数据和清理条件。

## 贡献示例

新增示例应满足：

- 可以独立运行；
- 不依赖生产服务或真实凭据；
- 提供最小 README 和明确运行命令；
- 场景、配置和注册 id 保持一致；
- 遵循 [安全指南](../SECURITY.md)；
- 不增加“即将支持”但没有实现的占位内容。

## 相关文档

- [主文档（Skill 接入）](../README.md)
- [场景规则预览](../docs/AI_SCENARIO_PROMPT.md)
- [安全指南](../SECURITY.md)
- [变更日志](../CHANGELOG.md)
- [发布流程](../docs/RELEASING.md)
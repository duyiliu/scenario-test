# scenario-test 示例索引

本目录提供可独立阅读和运行的场景示例。业务项目接入请从根目录 [README](../README.md) 的“快速接入”开始，不需要复制示例目录。

## 业务项目快速开始

默认采用免 npm 接入，不修改业务项目依赖：

1. 按根目录 [README](../README.md) “快速接入”安装全局 Skill，在业务项目根目录打开 AI。
2. 提供要测试的业务功能，以及页面、Controller、接口或已有测试入口。
3. 项目未接入时，Skill 自动初始化并运行 `doctor`；通过后生成场景。
4. 确认目标环境和场景内容后，再明确要求运行测试或启动工作台。

项目内生成的 `scenario-test/.scenario-test/AI_SCENARIO_PROMPT.md` 是后续场景设计规则，无需复制规则。npm 仅在用户明确要求时作为可选安装方式；两种方式不混用、不自动切换。

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

## 如何选择

| 目标 | 示例 |
| --- | --- |
| 了解最小配置和基础请求 | Basic |
| 查看认证、多步骤编排和重试 | Complete |
| 检查凭据、路径与错误处理 | Security Best Practices |
| 验证场景目录树与多级目录 | Tree Demo |

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

当前版本：v0.5.19
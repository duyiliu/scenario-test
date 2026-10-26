# AI 业务功能场景生成规则（仓库预览）

本文件仅供维护者了解规则结构。**业务用户不要直接复制本文件**，也不要把它作为实际生成输入。

实际执行时，以 `init` 写入业务项目的以下文件为准：

- `scenario-test/.scenario-test/AI_SCENARIO_PROMPT.md`
- `scenario-test/.scenario-test/SCENARIO_PATTERNS.md`
- `scenario-test/.scenario-test/scenario-test-capabilities.json`

这些文件与安装版本绑定。规则模板由 `src/init-templates.js` 维护，DSL 能力由 `src/contract.js` 投影；本预览不复制完整模板和操作符名单，避免形成第二份真相。

## 使用入口

首次接入使用根目录 [README](../README.md) “快速接入”中的 AI 接入 Prompt。安装和 doctor 完成后，AI 会自动读取项目内规则，用户不需要再次复制。

新会话只需输入：

```text
请读取 scenario-test/.scenario-test/AI_SCENARIO_PROMPT.md，为“<业务功能名称>”设计场景测试。入口：<页面、Controller、接口或已有测试路径>。
```

## 核心原则

项目内完整规则会约束 AI：

1. 一次只处理一个明确业务功能，不扫描整个项目批量生成。
2. 先基于 Controller、OpenAPI、前端调用、接口文档或已有测试建立功能卡片和场景矩阵。
3. 不猜测接口路径、字段、认证方式、枚举、响应结构或错误字段；证据不足时列为待确认项。
4. 成功、校验、权限、边界、幂等和状态流转是独立验证路径，没有证据的类别不生成。
5. 场景必须独立运行，通过 `extract` 串联数据；`from: "headers"` 配 `path` 时首段头名按大小写不敏感匹配（与断言 `from: "headers"`、`header` 简写同口径），首段后的子路径在头值上取；写操作使用测试标记，并且只做可证明安全的精确清理。
6. 默认失败即停止；`retryUntil` 必须断言已确认终态，禁止固定等待或只断言字段存在。`retryUntil.retryOn` 默认 `["assertion"]`，仅在等待服务/容器就绪且网络错误或单次超时应参与轮询时才声明 `"error"`/`"timeout"`。长轮询需要指数退避时，可按证据声明 `intervalFactor`（≥1，默认 1 = 固定间隔，第 n 次重试等待 = `intervalMs × intervalFactor^(n-1)`）与 `maxIntervalMs`（单次等待上限，≥`intervalMs`）；未声明上限不封顶，最终仍受 100ms 下限与 `maxElapsedMs` 总时限约束。
7. 不修改业务代码、构建配置和公共运行时，不写入生产地址、真实个人数据或固定凭据。
8. 完成后只给出场景矩阵、改动文件、待确认项和运行命令，不实际调用业务接口。

当前契约的 `when` 对象形式支持基于已提取变量（`vars`）、上一步响应体（`lastResponse`）或上一步状态码（`status` / `target: "status"`）跳过步骤；完整来源与操作符名单以项目内能力清单和 `AI_SCENARIO_PROMPT.md` 为准，本预览不复制完整名单。

## 能力核对

需要确认当前版本的操作符、变量、`when`、`extract` 或 CLI 参数时，读取项目内能力清单，或执行：

```powershell
node .\scenario-test\.scenario-test\scenario-test-cli.cjs capabilities
node .\scenario-test\.scenario-test\scenario-test-cli.cjs capabilities --json
```

npm 模式可将项目内 CLI 替换为 `npx @yc_yzkj/scenario-test`。

不要依据本预览、旧版本文档或模型记忆手抄能力名单。
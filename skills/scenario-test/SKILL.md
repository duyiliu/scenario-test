---
name: scenario-test
description: 为当前业务项目接入、设计、维护、诊断或执行 scenario-test HTTP 业务场景测试。用户提到为某个业务功能、Controller、接口链路生成场景测试，或操作 scenario-test 时使用；普通单元测试、代码审查和无关 E2E 测试不要触发。
---

# scenario-test：全局入口，多业务项目独立使用

本 Skill 安装在 Agent 的**用户级**目录，一次安装后可处理当前工作区内的多个业务项目。**禁止在每个业务项目复制或维护本 Skill**；各项目保留自己的 `scenario-test/`、DSL 规则、能力清单和运行时；已接入项目使用项目内 CLI，未接入时使用 Skill 自带发布版初始化。不要维护全局项目注册表，也不要扫描磁盘寻找其它项目。

## 路由（先判断意图，再动作）

1. 先执行只读探测（需要 Node.js 18+）：`node <本Skill目录>/scripts/detect-project.mjs --cwd <当前工作目录>`。该脚本只向上查找最近的项目边界或安装目录。已明确给出业务项目根目录时用 `--project <路径>`；自定义场景目录用 `--dir <相对路径>`。不要猜测缺失的项目路径。环境检查（`node -v`、目录可写、Skill 运行时完整）只在需要初始化时按 [init.md](references/init.md) 执行；`status=installed` 时不要重复检查或重新初始化。
2. `status=installed`：只证明文件存在，**不代表 doctor PASS**。使用脚本返回的 `projectRoot`、`scenarioDir`、`config` 等路径。不同项目不可混用规则/配置；不要自动执行 `init` 或升级。
3. `status=not-initialized`：阅读 [初始化工作流](references/init.md)。当本次请求是生成/补充/执行场景测试（或用户明确要求接入）时，**自动初始化**：在确认的项目根目录使用 Skill 自带的发布版 CLI 初始化（见 [init.md](references/init.md)，免 npm），随后重新探测并运行 `doctor`；安装前用一行说明将执行什么。用户明确拒绝或设置 `SCENARIO_TEST_NO_AUTO_INIT=1` 时改为先征询；仅询问能力/文档时不安装。
4. `status=incomplete`：报告 `missing`，阅读 [初始化工作流](references/init.md)，在用户授权后修复；不要将不完整状态当成可用。
5. 按本次意图选择：**接入/修复/升级** → [init.md](references/init.md)；**生成/修改/补充场景** → [author.md](references/author.md)；**执行/调试/启动工作台** → [execute.md](references/execute.md)。一次请求可以按先后顺序使用多个工作流；初始化按第 3 条自动执行，编写阶段不调用接口，执行阶段仍需用户明确提出。

## 不变约束

- DSL 的事实来源是当前业务项目的 `.scenario-test/scenario-test-capabilities.json`（由库中 `src/contract.js` 生成）；场景编写规则以同一项目同版本的 `AI_SCENARIO_PROMPT.md` 和 `SCENARIO_PATTERNS.md` 为准。**不要依据本 Skill 自行发明操作符、字段、CLI 参数或接口响应**。
- 默认免 npm 接入，不修改业务应用源码、`package.json` 或构建配置；不克隆公共库源码；不覆盖已有配置/场景。自动初始化只针对未接入项目；已接入项目不自动升级运行时，更新运行时需要用户明确要求，尤其不可自动 `--force`。
- 只分析用户指定的业务功能及直接证据，不扫描整个项目批量生成。
- **生成场景 ≠ 执行测试**。编写阶段绝不调用 HTTP 接口、启动服务或写入实际业务数据；运行阶段需要用户明确提出，写操作/非本地环境遵守 [execute.md](references/execute.md) 的安全闸门。
- **已接入项目的诊断、执行与工作台使用项目内 CLI**：`node <cli> doctor|run|serve|capabilities`，其中 `<cli>` 是探测结果的 `cli`。项目和 Skill 版本可以不同，不因此阻止使用或自动升级；以项目自身的 doctor 和能力清单为准。禁止直接 `require`/`import` 运行时（UMD、内部模块），也禁止自写脚本或临时 HTTP 请求复现场景执行；命令与参数以该项目 `capabilities --json` 和 `--help` 为准。
- 禁止将 Token、Secret、个人数据或生产环境地址写死在场景与提交内容中。
- 每个项目独立检查，工作树（`.git` 为文件）和多项目并行同样适用；全局 Skill 更新不意味着业务项目运行时更新。

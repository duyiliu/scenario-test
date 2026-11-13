---
name: scenario-test
description: 为当前业务项目接入、设计、维护、诊断或执行 scenario-test HTTP 场景及其浏览器 E2E 测试。普通单元测试、代码审查和无关 E2E 测试不要触发。
metadata:
  version: "0.15.0"
---

# scenario-test：全局入口，多业务项目独立使用

本 Skill 安装在 Agent 的**用户级**目录，一次安装后可处理当前工作区内的多个业务项目。**禁止在每个业务项目复制或维护本 Skill**；各项目只保留自己的 `scenario-test/` 场景数据（`scenario.config.js` 与 `scenarios/`，可选 `e2e/`），**运行时统一使用本 Skill 的 `runtime/`**（v23 起项目不再落 `.scenario-test/` 副本）。Skill 不维护全局项目注册表，也不要扫描磁盘寻找其它项目；`serve` 的用户级端口登记由运行时 CLI 管理（见下）。

## 路由（先判断意图，再动作）

1. 先执行只读探测（需要 Node.js 22+）：`node <本Skill目录>/scripts/detect-project.mjs --cwd <当前工作目录>`。该脚本只向上查找最近的项目边界或安装目录。已明确给出业务项目根目录时用 `--project <路径>`；自定义场景目录用 `--dir <相对路径>`。不要猜测缺失的项目路径。环境检查（`node -v`、目录可写、Skill 运行时完整）只在需要初始化时按 [init.md](references/init.md) 执行；`status=installed` 时不要重复检查或重新初始化。
2. `status=installed`：只证明文件存在，**不代表 doctor PASS**。使用脚本返回的 `projectRoot`、`scenarioDir`、`config` 与 `cli`/`skillCli`（统一指向 Skill 运行时）。不同项目不可混用规则/配置；不要自动执行 `init` 或升级。
3. `status=not-initialized`：阅读 [初始化工作流](references/init.md)。当本次请求是生成/补充/执行场景测试（或用户明确要求接入）时，**自动初始化**：在确认的项目根目录使用 Skill 自带的发布版 CLI 初始化（见 [init.md](references/init.md)，免 npm），随后重新探测并运行 `doctor`；安装前用一行说明将执行什么。用户明确拒绝或设置 `SCENARIO_TEST_NO_AUTO_INIT=1` 时改为先征询；仅询问能力/文档时不安装。
4. `status=incomplete`：报告 `missing`，阅读 [初始化工作流](references/init.md)，在用户授权后修复；不要将不完整状态当成可用。
5. 按本次意图选择：**接入/修复/升级** → [init.md](references/init.md)；**生成/修改/补充场景** → [author.md](references/author.md)；**执行/调试/启动工作台** → [execute.md](references/execute.md)。用户只要求**评估测试设计/还有哪些值得补测**时，只读分析：不改文件、不初始化、不执行，也不按此流程产出场景。一次请求可以按先后顺序使用多个工作流；初始化按第 3 条自动执行，编写阶段不调用接口，执行阶段仍需用户明确提出。
6. **按测试对象路由，不按用户措辞路由**：用户说“E2E / 端到端 / 浏览器测试 / 场景测试”时，先判断断言落在哪一层——
   - 验证目标是**浏览器行为**（页面跳转与路由守卫、DOM 文本、表单交互、多页联动、localStorage/会话对界面的影响、截图证据）→ 必须阅读 [E2E 工作流](references/e2e.md)并走 `init --e2e` 托管链路；**不得**把这类需求降级成 HTTP 场景，也不得绕开项目 `scenario-test/e2e/` 另起炉灶写散装 Playwright。
   - 验证目标是**接口契约**（状态码、响应字段、错误码、业务规则、数据流转）→ 走 [author.md](references/author.md) 生成 HTTP 场景。
   - 同一功能两层都要时，先出一份场景矩阵再按上述判据分配，两层场景不重复。
   - **目录落点**：前后端同仓时 `scenario-test/` 落仓根（HTTP 场景与 `e2e/` 同目录）；分仓时接口场景落后端仓、浏览器 E2E 落前端仓，跨端流程测试放前端仓；原则是**测试与被测代码同仓同 PR**（详见 [init.md](references/init.md)「目录落点决策」）。
7. 该能力需显式初始化与独立依赖，优先检查当前运行时 `capabilities`；保留已有项目场景数据。

## 不变约束

- DSL 的事实来源是安装方运行时的 `scenario-test-capabilities.json`（由库中 `src/contract.js` 生成）；场景编写规则以同一来源的 `AI_SCENARIO_PROMPT.md` 和 `SCENARIO_PATTERNS.md` 为准（均在 `runtime/`）。**不要依据本 Skill 自行发明操作符、字段、CLI 参数或接口响应**。
- 默认免 npm 接入，不修改业务应用源码、`package.json` 或构建配置；不克隆公共库源码；不覆盖已有配置/场景。自动初始化只针对未接入项目；更新运行时=更新安装方（本 Skill 或用户级安装），需要用户明确要求，不可自动 `--force`。
- 只分析用户指定的业务功能及直接证据，不扫描整个项目批量生成。
- **生成场景 ≠ 执行测试**。编写阶段绝不调用 HTTP 接口、启动服务或写入实际业务数据；运行阶段需要用户明确提出，写操作/非本地环境遵守 [execute.md](references/execute.md) 的安全闸门。
- **诊断、执行与工作台统一使用 Skill 运行时 CLI**：`node <cli> doctor|run|serve|capabilities`，其中 `<cli>` 是探测结果的 `cli`/`skillCli`（指向本 Skill `runtime/`）。项目内不再有运行时副本；`doctor` 会在场景用到高于当前 contract 的能力时提示升级安装方。禁止直接 `require`/`import` 运行时（UMD、内部模块），也禁止自写脚本或临时 HTTP 请求复现场景执行；命令与参数以 `capabilities --json` 和 `--help` 为准。工作台端口由用户级项目登记固定：`serve` 缺省复用登记端口，查看或修改用 `node <cli> projects list|set-port <端口>`。登记文件默认在 `~/.scenario-test/projects.json`。
- 禁止将 Token、Secret、个人数据或生产环境地址写死在场景与提交内容中。
- 每个项目独立检查，工作树（`.git` 为文件）和多项目并行同样适用；Skill 更新即全部项目运行时更新，无需逐项目同步。

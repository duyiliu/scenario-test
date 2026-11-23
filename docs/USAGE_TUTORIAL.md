# scenario-test 官方使用教程

> 版本基线：`@yc_yzkj/scenario-test` **0.15.0**，contract **v24**，运行要求 **Node.js 22+**。
> 本文内容与仓库权威来源一致：`README.md`、`docs/INTERNAL_USAGE_GUIDE.md`、`src/contract.js`（DSL 唯一事实来源）、Skill `references/*.md` 与 CLI `--help`。
> 能力名单如需二次确认，以 `capabilities --json` 为准，不要凭记忆手抄。

---

## 目录

1. [工具是什么](#1-工具是什么)
2. [安装全局 AI Skill](#2-安装全局-ai-skill)
3. [接入业务项目](#3-接入业务项目)
4. [项目目录结构](#4-项目目录结构)
5. [第一个场景：配置 + 场景](#5-第一个场景配置--场景)
6. [DSL 完整参考](#6-dsl-完整参考)
7. [运行：CLI 与浏览器工作台](#7-运行cli-与浏览器工作台)
8. [报告与 CI 集成](#8-报告与-ci-集成)
9. [导入真实流量](#9-导入真实流量)
10. [浏览器 E2E（可选）](#10-浏览器-e2e可选)
11. [诊断、升级与多项目](#11-诊断升级与多项目)
12. [安全实践](#12-安全实践)
13. [常见问题](#13-常见问题)

---

## 1. 工具是什么

`scenario-test` 是面向业务项目的 **HTTP 场景测试工具**，提供三层能力：

| 层 | 说明 |
| --- | --- |
| 声明式 DSL | 用变量、提取、断言、条件、重试描述 HTTP 场景 |
| 浏览器工作台 | 可视化查看场景、逐步执行、实时看请求/响应与断言 |
| Node.js CLI | 命令行/CI 执行同一套场景 |

设计原则：**免 npm 接入**——不修改业务项目的 `package.json` 或构建配置，运行时由安装方（全局 Skill 或用户级目录）提供，业务项目里只存**场景数据**（配置 + 场景文件）。

---

## 2. 安装全局 AI Skill

在 Codex、Claude Code、Kilo Code 等支持 Agent Skills 的工具中，按**用户级**安装一次，即可在多个业务项目使用。

**官方安装（钉版本，推荐团队使用）：**

```bash
npx skills add duyiliu/scenario-test#v0.15.0 --skill scenario-test -g
```

**国内网络加速（第三方 `skills-cn`）：**

```bash
npx skills-cn@latest add duyiliu/scenario-test#v0.15.0 --skill scenario-test -g -y
```

- `-g`：用户级全局安装；`-y`：跳过交互确认。
- `#vX.Y.Z` 钉住 Git Tag，Skill 与内置运行时版本固定、可复现；省略则跟随默认分支最新提交（尝鲜用）。
- 只安装 Skill，**不**在业务项目装 npm 依赖。Windows 原生与 WSL 的用户目录各自独立，需分别安装。

> Skill 自带发布版运行时；初始化时把运行时能力用于该项目。v23 起**项目内不再落 `.scenario-test/` 运行时副本**，执行/工作台统一使用安装方运行时。

未装 Skill 也可用**固定版本安装脚本**手动接入（下文第 3.2 节）。

---

## 3. 接入业务项目

### 3.1 通过 AI 助手接入（推荐）

1. 在业务项目根目录打开支持 Agent Skills 的 AI 助手。
2. 告诉它要测的业务功能，并提供**任一**入口：页面、Controller、接口文档或已有测试。例如：

   ```text
   为 OrderController 生成 HTTP 场景测试
   ```

3. 项目尚未接入时，Skill 会自动：确认项目根目录 → 用自带发布版 `init` → 运行 `doctor`。
4. AI 依据项目证据维护 `scenario.config.js` 和 `scenarios/`。

> **生成 ≠ 执行**。生成阶段不调用任何业务接口；需要执行时须你明确提出并确认目标环境与场景内容。
> 设置 `SCENARIO_TEST_NO_AUTO_INIT=1` 可禁止自动初始化，改为先征询。

### 3.2 手动安装脚本（无 Skill 时）

在业务项目根目录执行，脚本按固定 GitHub Tag 经 jsDelivr 下载 `dist/` 运行时并初始化 `scenario-test/`，安装后自动 `doctor`：

```powershell
# Windows PowerShell
irm https://cdn.jsdelivr.net/gh/duyiliu/scenario-test@v0.15.0/scripts/install.ps1 | iex
```

```bash
# macOS / Linux
curl -fsSL https://cdn.jsdelivr.net/gh/duyiliu/scenario-test@v0.15.0/scripts/install.sh | bash -s -- . scenario-test
```

不执行 `npm install`，不访问 GitHub API。

### 3.3 直接调用 CLI init（已有运行时）

```bash
node <运行时目录>/scenario-test-cli.cjs init --project <项目根> --dir scenario-test --no-input
```

- `--no-input`：非交互，目录已存在时按 keep 语义**保留** `scenario.config.js` 与 `scenarios/`，仅刷新 `README.md` 与 `start-scenario-test.cmd`。**可安全重复执行**。
- `--force`：覆盖已有配置/场景（危险，默认不要用）。
- `--clean`：仅清理旧版（v22 及以前）遗留的项目内运行时副本 `.scenario-test/` 与根目录 `index.html`，不触碰配置与场景。

---

## 4. 项目目录结构

初始化后：

```text
scenario-test/
├─ scenarios/                   # 按业务功能组织的场景文件（AI 维护）
├─ plugins/                     # 可选：项目专属 Node 插件（按需创建）
├─ e2e/                         # 可选：浏览器 E2E（init --e2e 生成）
├─ e2e-results/                 # E2E 产物（gitignore）
├─ scenario.config.js           # 环境、变量、场景清单
├─ README.md                    # 目录说明（init 生成）
└─ start-scenario-test.cmd      # Windows 双击启动入口（记录本机运行时 CLI 路径）
```

- `scenario.config.js` 与 `scenarios/` 应**随业务项目提交**。
- `start-scenario-test.cmd` 记录本机运行时绝对路径，跨机器不一致时可加入 gitignore。
- 不要把真实凭据写进这些文件。

---

## 5. 第一个场景：配置 + 场景

### 5.1 配置文件 `scenario-test/scenario.config.js`

```javascript
ScenarioTest.registerConfig(ScenarioTest.defineConfig({
    // 环境列表：key 用于 --env，baseUrl 可被 --base-url 临时覆盖
    envs: [
        { key: "local", name: "本地", baseUrl: "http://localhost:8080" },
        { key: "dev",   name: "开发", baseUrl: "https://dev.example.com" }
    ],
    defaultEnvKey: "local",          // 省略 --env 时使用

    // 全局参数：追加到每个请求（类型 header / cookie / query）
    globals: [
        { type: "header", name: "X-Scenario-Env", value: "local" }
    ],

    requestTimeoutMs: 5000,          // 全局请求超时
    storagePrefix: "my-project.scenario-test",

    // 运行时变量（值支持 {{ }} 模板）
    vars: { expectedStatus: "UP" },

    // 需要外部注入的变量声明（用于环境变量/页面覆盖）
    variables: [
        { name: "apiToken", label: "API Token", env: "API_TOKEN", required: true }
    ],

    // 场景清单：id 必须等于该文件 registerScenario 的 ID
    scenarios: [
        { id: "health-check", name: "健康检查", url: "scenarios/health-check.js" }
    ]
}));
```

配置顶层允许的键：`envs`、`defaultEnvKey`、`globals`、`vars`、`scenarioVars`、`variables`、`scenarios`、`requestTimeoutMs`、`maxResponseBytes`、`maxUploadBytes`、`storagePrefix`、`storageKeys`、`baseUrl`、`authorization`、`nodePlugins`、`envVars`（拼错键会在定义期报错）。

### 5.2 场景文件 `scenario-test/scenarios/health-check.js`

```javascript
ScenarioTest.registerScenario("health-check", ScenarioTest.defineScenario({
    name: "健康检查",
    steps: [
        {
            name: "检查服务状态",
            method: "GET",
            path: "health",                       // 相对 baseUrl
            status: 200,                          // 期望 HTTP 状态码
            assertions: [
                { path: "status", equals: "UP" }  // 断言响应 body.status
            ]
        }
    ]
}));
```

> 接口路径与字段仅为示例，使用前按实际接口调整。

### 5.3 运行

```bash
node <运行时目录>/scenario-test-cli.cjs run \
  --config ./scenario-test/scenario.config.js \
  --env local --scenario health-check
```

---

## 6. DSL 完整参考

### 6.1 场景（`defineScenario`）顶层键

| 键 | 说明 |
| --- | --- |
| `name` | 场景名称 |
| `steps` | 步骤数组 |
| `vars` | 场景级变量（支持 `{{ }}`） |
| `envVars` | 变量 → 环境变量名映射（运行时从进程环境取值） |
| `generatedVars` | 测试造数声明（见 6.6） |
| `failurePolicy` | `"stop"`（默认，失败即停）/ `"continue"` |
| `tags` | 场景元数据标签 |

### 6.2 步骤（step）字段

| 字段 | 说明 |
| --- | --- |
| `name` | 步骤名 |
| `method` / `path` | HTTP 方法与路径（相对 `baseUrl`） |
| `params` | 查询参数对象 |
| `request` | 请求定义对象（下节） |
| `status` | 期望 HTTP 状态码 |
| `assertions` | 断言数组 |
| `extract` | 提取数组 |
| `when` | 条件跳过（见 6.4） |
| `retryUntil` | 重试直到满足（见 6.5） |
| `timeoutMs` | 本步骤超时 |
| `saveResponseAs` | 保存响应到文件 |
| `adapter` | 指定适配器 |
| `always` | `true` 时即使前面普通步骤失败仍执行（teardown 用；用户取消时不跑） |

`request` 允许的键：`method`、`path`、`params`、`headers`、`body`、`fileUpload`、`timeoutMs`、`credentials`、`redirect`、`useEnvironmentAuthorization`。

### 6.3 断言（`assertions`）

元数据键：`name`、`path`、`from`、`target`、`header`、`implicit`。

- `path`：取值路径，支持 `[*]` 通配段（仅在数组上展开，连续通配展平成一级数组）。例：`items[*].id` → `[1,2,3]`。
- `from`：数据来源 `body`（默认）/`vars`/`suite`/`headers`/`bodyText`。`from: "headers"` 配 `path` 时**首段头名大小写不敏感**。
- `target`：`status`（HTTP 状态码）/`duration`（本次请求耗时毫秒）。

**操作符（operators）：**

| 操作符 | 说明 |
| --- | --- |
| `exists` | 字段存在且非 null/空串（`true`）/ 不存在（`false`） |
| `equals` / `notEquals` | JSON 深比较相等 / 取反 |
| `includes` / `contains` | 数组包含期望项，或字符串包含子串（二者同口径，`contains` 是别名） |
| `each` | 数组逐项断言，期望为子断言对象或其数组 |
| `shape` | 结构校验（jsonSchema-lite）：`type/required/properties/items/enum/additionalProperties` |
| `jsonSchema` | JSON Schema draft-07 常用子集深校验（不解析 `$ref`，未知键定义期即拒） |
| `matches` | 正则匹配字符串化后的实际值 |
| `oneOf` | 实际值属于期望候选数组之一（深比较） |
| `startsWith` / `endsWith` | 字符串前缀/后缀（大小写敏感） |
| `length` | 数组元素数 / 字符串字符数 / 对象键数 |
| `gt` / `gte` / `lt` / `lte` | 数值比较（只接受有限 number） |

示例：

```javascript
assertions: [
    { path: "status", equals: "success" },
    { path: "data.items", exists: true },
    { path: "data.total", gt: 0 },
    { path: "data.state", oneOf: ["pending", "completed"] },
    { path: "data.items", length: 3 },
    { path: "data.items[*].id", each: { gt: 0 } },
    { target: "status", equals: 200 },
    { target: "duration", lte: 800 }
]
```

### 6.4 条件执行（`when`）

两种形式：

**对象形式** — 来源 `vars` / `suite` / `lastResponse`（上一步响应 body）/ `status`（上一步状态码），也可用 `target: "status"`：

```javascript
// 上一步响应 body 的 data.ready 为 true 才继续
{ name: "继续校验", when: { from: "lastResponse", path: "data.ready", equals: true } }

// 上一步状态码为 202 才继续
{ name: "轮询结果", when: { from: "status", equals: 202 } }

// 仅开发环境执行清理
{ name: "清理数据", when: { from: "vars", path: "env", equals: "dev" } }
```

**非对象形式**（模板字符串/布尔）保持真值语义。

> 第一步没有"上一步响应"，引用 `lastResponse`/`status` 时按来源缺失处理，条件不成立（SKIP），不抛错中断。

### 6.5 重试（`retryUntil`）

```javascript
{
    name: "等待任务完成",
    method: "GET",
    path: "tasks/{{vars.taskId}}",
    retryUntil: {
        maxAttempts: 10,          // 最大尝试总次数（含首次请求）
        intervalMs: 2000,         // 基础间隔
        intervalFactor: 2,        // 指数退避：第 n 次等待 = intervalMs × factor^(n-1)
        maxIntervalMs: 10000,     // 单次等待上限（未声明不封顶）
        maxElapsedMs: 60000,      // 总时长上限
        retryOn: ["assertion", "error", "timeout"]  // 参与重试的失败类型
    },
    assertions: [ { path: "status", equals: "completed" } ]
}
```

- `retryOn`：`assertion`（默认，断言未过）/ `error`（网络/适配器异常）/ `timeout`（单次请求超时）。默认仅 `["assertion"]`。服务刚启动、首轮可能 `ECONNREFUSED` 时，加 `error`/`timeout` 让其继续轮询。**非幂等写操作开启重试前先确认安全。**
- 间隔最终仍受 **100ms 下限**与 `maxElapsedMs` 总时限约束。
- 禁止固定 sleep，也不要只用 `exists` 断言；必须断言**已确认的终态**。

### 6.6 测试造数（`generatedVars`）

在场景顶层声明，步骤中用 `{{vars.<name>}}` 引用。证件/号码/枚举类按 `runId` + 变量名**确定性派生**（轮内稳定、跨轮换号、校验位合法），撞唯一约束时重跑即换号。

```javascript
generatedVars: [
    { name: "idNo",   type: "idcard", birthDate: "1990-06-15", gender: "FEMALE" }, // GB 11643
    { name: "mobile", type: "phone", prefix: "138" },                              // 大陆手机号
    { name: "cardNo", type: "luhn", length: 16, prefix: "62" },                    // Luhn 银行卡
    { name: "corpCode", type: "uscc", regionCode: "110100" },                      // GB 32100
    { name: "orderId", type: "uuid" },                                             // uuidHex=32 位无连字符
    { name: "expireAt", type: "timestamp", offset: "+30d", unit: "s" },            // unit: ms(默认)/s
    { name: "signTime", type: "timestamp", offset: "-1h", format: "YYYY-MM-DD HH:mm:ss" }, // format 与 unit 互斥
    { name: "channel", type: "enum", values: ["APP", "WEB", "H5"], weights: [5, 3, 2] }   // 缺省等权
]
```

类型全集：`timestamp`、`uuidHex`、`md5`、`signature`、`idcard`、`luhn`、`phone`、`uscc`、`uuid`、`enum`。

### 6.7 提取（`extract`）

元数据键：`name`、`path`、`from`、`target`、`header`、`required`、`default`、`scope`。

- `from`：`body`（默认）/`headers`/`bodyText`/`response`。
- `target`：`status`（状态码）/`duration`（单次耗时毫秒，不含重试等待）。
- `required: true`：路径不存在则当前步骤失败；`default`：路径缺失取兜底值（支持模板，与 `required` 互斥）。
- `scope`：`step`（默认，写入当前场景 `vars`）/ `suite`（写入本次 run 共享命名空间，见 6.8）。
- `path` 支持 `[*]` 通配一次提整列。

```javascript
extract: [
    { name: "orderId", path: "data.orderId" },        // 后续 {{vars.orderId}}
    { name: "ids", path: "data.items[*].id" },        // 产出数组 [1,2,3]
    { name: "elapsed", target: "duration" },          // 本次请求毫秒耗时
    { name: "token", path: "data.token", scope: "suite" }
]
```

### 6.8 跨场景共享 `suite`

登录 token、租户 ID 等一次获取、多场景复用的前置产物，用 `scope: "suite"` 写入本次 run 的共享命名空间：

```javascript
// login.js
{ name: "登录", method: "POST", path: "login",
  extract: [{ name: "loginToken", path: "data.token", scope: "suite" }] }

// profile.js
{ name: "查资料", path: "profile",
  request: { headers: { Authorization: "Bearer {{suite.loginToken}}" } } }
```

语义：
- 仅同一 run 内共享，不跨 run、不落盘。
- `when`/断言支持 `from: "suite"`；`{{suite.<name>}}` 可用于 path/params/headers/body。
- 每个场景启动取快照、结束合并；默认串行写序即清单顺序，`--concurrency > 1` 时为完成顺序（同名键后完成者覆盖）。
- **不建立失败依赖**：前置失败不会自动跳过后续，缺失变量按空值解析，由断言暴露。

### 6.9 上传、保存、失败策略

```javascript
// 文件上传（受路径穿越防护）
{ name: "上传文件", method: "POST", path: "upload",
  request: { fileUpload: { file: "testdata/sample.pdf", field: "attachment" } } }

// 保存响应到文件
{ name: "下载报告", path: "reports/{{vars.reportId}}",
  saveResponseAs: "output/report-{{vars.reportId}}.pdf" }
```

`always: true` 的步骤在前置普通步骤失败（`failurePolicy: stop`）后仍执行，用于 teardown；用户取消时不运行。

### 6.10 保留变量与变量优先级

- 保留变量（禁止声明/覆盖）：`runId`、`runNo`、`__proto__`、`constructor`、`prototype`。
- 变量优先级：**CLI `--vars` > 配置 `vars` > 场景 `vars` > `variables[].defaultValue`**，环境变量通过 `env` 映射或 `SCENARIO_AUTH` 注入。

---

## 7. 运行：CLI 与浏览器工作台

### 7.1 CLI 命令

| 命令 | 用途 |
| --- | --- |
| `run` | 执行场景 |
| `serve` | 启动浏览器工作台（静态服务 + 同源代理，免 CORS） |
| `init` | 初始化项目场景目录 |
| `capabilities` | 输出 DSL 能力清单（`--json` 机器可读） |
| `doctor` | 静态体检：Node 版本、配置/场景加载、DSL 校验、AI 规则就绪 |
| `import` | HAR / curl 导入场景草稿 |
| `projects` | 用户级项目登记（端口）管理 |

### 7.2 `run` 常用参数

```bash
# 指定场景
node <cli> run --config ./scenario-test/scenario.config.js --env local --scenario health-check

# 全部非 manual 场景
node <cli> run --config ./scenario-test/scenario.config.js --env local --all

# 并发 4 个场景（场景内步骤始终串行）
node <cli> run --config ./scenario-test/scenario.config.js --env local --all --concurrency 4

# 临时覆盖变量 / 请求超时（--vars 可重复，后者覆盖，值支持 {{ }}）
node <cli> run --config ./scenario-test/scenario.config.js --env local --all \
  --vars clientId=temporary-client --vars "secret={{vars.defaultSecret}}" --timeout 5000

# 多场景多选（逗号分隔，按 id/name/url 匹配）
node <cli> run ... --scenario login,order
```

关键语义：
- 省略 `--all`/`--scenario` 时**只执行清单第一个场景**。
- `manual: true` 场景默认被 `--all` 排除，需 `--scenario <id>` 显式执行。
- `--base-url <url>` 临时切换目标；`--env` 省略时用 `defaultEnvKey`。
- `--bail` 任一失败即不再启动后续场景；`--fail-on-skip` 有 SKIP 则退出码 1；`--cookie-jar` 每场景内存 Cookie Jar。
- `--tag` 按标签筛选（重复参数 OR，参数内逗号 AND）。
- `--data <file>` 数据驱动（JSON/JSONL/CSV，每行变量集跑一次）。
- `--json` stdout 纯净结构化结果，进度/结论走 stderr，失败仍输出完整 JSON 且退出码非零。

### 7.3 浏览器工作台

双击 `scenario-test/start-scenario-test.cmd`，或：

```bash
node <cli> serve --config ./scenario-test/scenario.config.js --open
```

- 未指定 `--port` 时复用用户级登记端口（首次从 4300 起分配，写入 `~/.scenario-test/projects.json`）；显式 `--port` 会**更新登记**（非一次性）。
- 登记管理：`projects list`、`projects set-port 4301`、`projects set-default-port 4300`、`projects remove`；`SCENARIO_TEST_HOME` 可覆盖登记目录。
- 上游空闲超时默认 30 秒，慢接口可调 `--proxy-timeout 120000`（毫秒，1–600000）。
- **安全默认值**：默认校验 https 上游证书；内网自签联调才加 `--insecure`。代理仅接受与 serve 同源的请求（`Origin`/`Referer` 不匹配返回 403），不要暴露到回环之外。
- 工作台能力：场景列表（按 `url` 还原目录树）、逐步执行、实时请求/响应与失败断言值、运行时变量面板（`suite.` 前缀展示）。

---

## 8. 报告与 CI 集成

```bash
node <cli> run --config ./scenario-test/scenario.config.js --env local --all \
  --report reports/result.html \
  --junit  reports/result.xml \
  --json
```

- `--report`：自包含离线 HTML（仅保留运行证据，不嵌源码；敏感变量值脱敏，长证据截断）。
- `--junit`：JUnit XML。
- `--json`：结构化结果。
- `--concurrency` / `--bail` / `--tag` / `--data` 与批量组合使用。

> 参数是否可用以当前运行时 `capabilities --json` 与 `--help` 为准；批量与 `--all` 仍受目标环境安全约束（见第 12 节）。

---

## 9. 导入真实流量

把浏览器 Network 导出的 HAR 或后端 curl 示例转成可编辑场景草稿（从**业务项目根目录**执行）：

```bash
# HAR：过滤静态资源/OPTIONS，每个 API 请求生成一个 step
node <cli> import --har session.har --output scenario-test/scenarios/imported-har.js

# 单条 curl：生成单步骤草稿并打印可粘贴的 step 片段
node <cli> import --curl 'curl -X GET https://api.example.com/orders' \
  --output scenario-test/scenarios/imported-orders.js

# 指定主机、最多 10 条
node <cli> import --har session.har --host api.example.com --max-entries 10 \
  --output scenario-test/scenarios/imported-filtered.js
```

- `Authorization`、`Cookie`、API Key 等**可识别的**敏感头/查询参数会替换为 `{{vars.*}}` 占位；二进制/multipart 请求体省略并注明。
- **请求体与未识别的自定义敏感字段可能原样写入草稿**：生成后、提交前务必检查凭据与业务数据。
- 默认 `--max-entries` 50。生成的 `url` 相对配置文件目录，需加入 `scenarios` 清单后再执行。

---

## 10. 浏览器 E2E（可选）

当验证目标是**浏览器行为**（路由守卫、DOM、表单、localStorage 对界面的影响、截图证据）时走 E2E；**接口契约**（状态码、字段、错误码）走 HTTP 场景。

```powershell
node <cli> init --project . --dir scenario-test --e2e --no-input
cd scenario-test/e2e
npm install
$env:E2E_BROWSER_CHANNEL = "chrome"          # 用系统 Chrome；用 Playwright Chromium 则先显式安装
$env:E2E_BASE_URL = "http://127.0.0.1:3000"
cd ../..
node <cli> serve --config scenario-test/scenario.config.js --open
```

- 工作台首页有"浏览器 E2E"入口，也可打开 `/e2e/`；可按文件选测、有头模式、停止、查看截图/日志/报告。
- `e2e/playwright.config.js`、`auth-adapter.js`、`tests/` 由业务项目维护；账号属场景，凭据走环境变量或项目凭据提供器。
- 结果在 `e2e-results/`（不入库），每次运行独立 runId。
- 已有自管 `e2e/` 时 init 会拒绝混入，需人工迁移。

> E2E 需独立 Playwright 依赖与浏览器；HTTP 接入仍免 npm。

---

## 11. 诊断、升级与多项目

### 11.1 doctor 体检

```bash
node <cli> doctor --config ./scenario-test/scenario.config.js
```

校验配置、场景、运行时版本与能力清单。全部通过退出码 0；FAIL 按项列出。**doctor 是静态体检，不替代实际执行。**

### 11.2 能力清单

```bash
node <cli> capabilities          # 人类可读
node <cli> capabilities --json   # 机器可读，供 AI 核对契约版本
```

### 11.3 升级

- **全局 Skill**：换 Tag 重装即可（覆盖同名 Skill），或未钉版本时 `npx skills update scenario-test -g`。
- **业务项目运行时**：向 AI 明确提出"将当前项目 scenario-test 运行时升级到最新版，保留配置和场景，升级后 doctor"。升级对象是**安装方运行时本身**（项目无版本锁）；默认保留 `scenario.config.js` 与 `scenarios/`。不要随意 `--force`。
- 升级后必须看 `doctor` 的版本锁/能力/配置结果，有 FAIL 先排查。

### 11.4 多项目 / 多形态

- Skill 用户级安装，一次覆盖当前工作区多个业务项目；各项目只保有自己的 `scenario.config.js` 与 `scenarios/`。
- 目录落点原则：**测试与被测代码同仓同 PR**。前后端同仓 → `scenario-test/` 落仓根；分仓 → 接口场景落后端仓、E2E 落前端仓、跨端流程放前端仓。
- 工作树（`.git` 为文件）与多项目并行同样适用。

---

## 12. 安全实践

- 场景文件是**可执行代码**（运行在 `node:vm` 沙箱），只加载可信来源。
- 不提交生产凭据、个人数据、真实 Token。CLI/CI 优先用环境变量：`SCENARIO_AUTH`（授权令牌）、`SCENARIO_GLOBALS`（JSON 数组全局参数）。
- 浏览器本地存储适合受控联调环境，不保存生产凭据。
- **执行可能创建/修改/删除业务数据**：执行有副作用的接口前，须具备安全测试环境、授权测试数据与可核实的清理方式；**不在生产环境自动执行写入类测试**。
- 详细见仓库 `SECURITY.md`。

---

## 13. 常见问题

**Q：运行时目录在哪？**
A：用户级 `~/.scenario-test/runtime/`，或 Skill 的 `runtime/`；`start-scenario-test.cmd` 记录了本机路径。v23 起项目内不再有副本。

**Q：工作台和 CLI 有什么区别？**
A：同一套场景。工作台可视化调试；CLI 适合批量/CI。

**Q：`id` 报错 / 场景加载失败？**
A：`scenario.config.js` 里清单项的 `id` 必须等于该文件 `registerScenario` 的 ID。多为场景按更高 contract 所写，按 `doctor` 的 fix 提示升级安装方。

**Q：如何只跑某个标签的场景？**
A：场景清单项声明 `tags: ["smoke"]`，用 `--tag smoke` 筛选（重复参数 OR，参数内逗号 AND；不会自动放行 `manual:true`）。

**Q：慢接口/大文件联调被代理超时打断？**
A：`serve --proxy-timeout 120000`（毫秒，1–600000）。

**Q：`git status` 显示 M 但 `git diff` 为空？**
A：CRLF 幻影改动（本仓库维护者场景）。跑 `npm run check:eol`，按提示 `git checkout -- <路径>` 或 `git add --renormalize .`。

---

> **唯一事实来源**：DSL/CLI 能力以 `capabilities --json`（由 `src/contract.js` 投射）为准；不要依据本文或模型记忆手抄操作符/字段名单。完整示例见仓库 `examples/`（basic / complete / security-best-practices / tree-demo / e2e）。

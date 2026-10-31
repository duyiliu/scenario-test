# scenario-test

面向业务项目的 HTTP 场景测试工具，提供声明式 DSL、浏览器工作台和 Node.js CLI。通过全局 AI Skill 接入业务项目，根据指定的业务入口生成场景，再用工作台或 CLI 运行同一套测试。默认免 npm 接入，不修改业务项目依赖，也无需克隆本仓库。

**运行要求：Node.js 18+**；维护本仓库并构建时需要 Node.js 20+。

| 你想做什么 | 从哪里开始 |
| --- | --- |
| 首次使用：安装全局 AI Skill | [安装全局 AI Skill](#安装全局-ai-skill) |
| 首次接入业务项目 | [快速接入](#快速接入) |
| 运行、导入或检查场景 | [常用操作](#常用操作) |
| 升级已有项目 | [升级](#升级) |
| 开发和发布本工具 | [维护者](#维护者) |

典型流程：在业务项目根目录接入 → 提供一个业务功能及其代码或接口入口 → 检查生成的场景和环境配置 → 使用工作台或 CLI 执行。执行场景会调用实际接口，可能产生业务数据，请先确认目标环境和场景内容。

## 安装全局 AI Skill

在 Codex、Claude Code、Kilo Code 等支持 Agent Skills 的工具中按用户安装一次，即可在多个业务项目中使用：

**官方安装（固定版本）：**

```bash
# 用户级全局安装；#v0.11.1 钉住 Git Tag，按提示选择你使用的 Agent
npx skills add duyiliu/scenario-test#v0.11.1 --skill scenario-test -g
```

**国内网络加速安装（第三方 `skills-cn`）：**

```bash
npx skills-cn@latest add duyiliu/scenario-test#v0.11.1 --skill scenario-test -g -y
```

两种方式均从本仓库安装 `scenario-test` Skill。`skills-cn` 为第三方 CLI，其自身版本不保证与官方同步；`-g` 表示用户级安装，`-y` 跳过交互确认。

`#vX.Y.Z` 钉住 Git Tag，Skill 与内置运行时版本固定、可复现（推荐团队环境使用）；省略 `#` 部分则跟随默认分支最新提交，适合尝鲜。升级到新版本时把 Tag 换成目标版本重新安装，或对未钉版本的安装执行 `npx skills update scenario-test -g`。

> 该命令安装用户级 Skill，不会在业务项目中安装 npm 依赖。Windows 原生与 WSL 的用户目录各自独立，需在使用的环境分别安装。

Skill 会在当前工作区定位业务项目，读取该项目自己的规则与能力清单。首次接入需要 Node.js 18+；Skill 自带发布版运行时，初始化时将运行时复制到业务项目；日常使用项目内版本，后续使用无需再次下载工具，执行测试仍需连接目标服务。

未接入项目会按[快速接入](#快速接入)自动初始化；设置 `SCENARIO_TEST_NO_AUTO_INIT=1` 或明确拒绝时，Skill 会先征询。项目不完整时不会自动修复。全局 Skill 和各项目运行时分别升级；已接入项目使用自己的 CLI，不要求与 Skill 版本一致，见[升级](#升级)。

Skill 入口和探测脚本分别见 [`SKILL.md`](skills/scenario-test/SKILL.md) 和 [`detect-project.mjs`](skills/scenario-test/scripts/detect-project.mjs)。探测只检查文件是否存在；配置与运行时完整性以 `doctor` 结果为准。

## 快速接入

1. 如果尚未安装全局 Skill，先完成上一节；然后在业务项目根目录打开支持 Agent Skills 的 AI 助手。
2. 告诉 AI 需要测试的业务功能，并提供页面、Controller、接口或已有测试中的任一入口。例如：`为 OrderController 生成 HTTP 场景测试`。
3. 项目尚未接入时，Skill 会确认项目根目录和环境，使用 Skill 自带的发布版初始化，再执行 `doctor`。已接入项目不会自动升级；体检失败时先处理问题。
4. AI 根据项目证据维护 `scenario.config.js` 和 `scenarios/`。生成阶段不会调用业务接口；需要执行时，请明确提出并确认目标环境和场景内容。

初始场景清单为空。场景准备好后，可用[浏览器工作台](#启动浏览器工作台)或 [CLI](#执行场景)运行；工作台通过本地 `serve` 代理访问所选环境，无需后端额外放行 CORS。

### Skill 使用的固定版本安装脚本

Skill 初始化时使用自身携带的发布版运行时。以下脚本供需要手动接入的用户使用。在业务项目根目录执行时，脚本下载固定版本运行时并初始化 `scenario-test/`，不修改业务项目依赖；安装后会自动执行 `doctor`。

```powershell
# Windows PowerShell
irm https://cdn.jsdelivr.net/gh/duyiliu/scenario-test@v0.11.1/scripts/install.ps1 | iex
```

```bash
# macOS / Linux
curl -fsSL https://cdn.jsdelivr.net/gh/duyiliu/scenario-test@v0.11.1/scripts/install.sh | bash -s -- . scenario-test
```

默认脚本按固定 GitHub Tag 经 jsDelivr 下载发布版 `dist/` 运行时文件，在临时目录就位后由 CLI 初始化；不会执行 `npm install` 或访问 GitHub API。内网下载源的指定方式和文件要求见[自定义下载源](#自定义下载源)。

## 常用操作

在业务项目根目录，也可以直接向 AI 提出操作，例如：

- `为 OrderController 补充订单创建失败的场景测试。`
- `在 local 环境运行 order-create-success 场景，并汇总结果。`
- `检查当前项目的 scenario-test 安装状态，运行 doctor。`
- `启动当前项目的场景测试工作台。`

生成场景不会自动发起 HTTP 请求；执行、批量运行和启动工作台需明确提出。执行可能修改业务数据，先确认目标环境、测试数据和清理方式。以下是需要手动操作或接入 CI 时的命令，均从业务项目根目录执行。

### 启动浏览器工作台

推荐双击：

```text
scenario-test/start-scenario-test.cmd
```

也可以手动执行：

```powershell
node .\scenario-test\.scenario-test\scenario-test-cli.cjs serve `
  --config .\scenario-test\scenario.config.js `
  --port 4300
```

> `serve` 未指定 `--port` 时默认 4300；双击 `start-scenario-test.cmd` 时脚本会向系统申请随机空闲端口，多项目同时启动互不冲突。
>
> 上游空闲超时默认 30 秒，慢接口/大文件联调时可调大：`--proxy-timeout 120000`（毫秒，1-600000 的整数）。
>
> **安全默认值**：`serve` 默认校验 https 上游证书；内网自签证书联调时显式加 `--insecure` 才跳过校验。代理仅接受与本机 serve 同源的浏览器请求（`Origin`/`Referer` 不匹配返回 403），且不要将 serve 暴露到本机回环之外。

#### 界面预览

浏览器工作台支持查看场景列表、逐步执行接口请求，并实时展示执行进度与结果。

![浏览器工作台执行中的场景](docs/images/4de29a29fae24d3a9f741c81e5240920.png)

场景执行完成后，工作台会汇总成功、失败和跳过的步骤，并展示耗时与执行详情。

![浏览器工作台执行完成](docs/images/864b439df03f4e4086f779ae394f05cc.png)

AI 辅助生成场景后，也可以通过 CLI 执行并汇总结果。

![AI 辅助设计与执行场景测试](docs/images/ac1142b74da24b0f88ee5d87b67fcac9.png)

### 执行场景

```powershell
# 全部非 manual 场景（命令 run 紧跟脚本名）
node .\scenario-test\.scenario-test\scenario-test-cli.cjs run `
  --config .\scenario-test\scenario.config.js --env local --all

# 指定场景
node .\scenario-test\.scenario-test\scenario-test-cli.cjs run `
  --config .\scenario-test\scenario.config.js --env local --scenario health-check

# 多场景并发（默认 1 串行；并发只发生在场景之间，场景内步骤仍串行）
node .\scenario-test\.scenario-test\scenario-test-cli.cjs run `
  --config .\scenario-test\scenario.config.js --env local --all --concurrency 4

# 临时覆盖变量 / 请求超时（无需修改配置）
node .\scenario-test\.scenario-test\scenario-test-cli.cjs run `
  --config .\scenario-test\scenario.config.js --env local --all `
  --vars clientId=temporary-client `
  --vars "clientSecret={{vars.defaultSecret}}" `
  --timeout 5000
```

`--vars key=value` 可重复，按出现顺序叠加（同名后者覆盖），优先级高于配置 `vars` 与环境变量，值支持 `{{ }}` 模板；`--timeout <ms>` 覆盖配置 `requestTimeoutMs`。`runId` / `runNo` 为保留变量，不能用 `--vars` 覆盖。

`--scenario` 支持逗号分隔多选，并按 id/name/url 匹配；省略 `--env` 时使用配置的 `defaultEnvKey`（未配置则取第一个环境）。临时切换目标可用 `--base-url <url>`；认证信息优先通过 `SCENARIO_AUTH` 环境变量提供。

以上命令从业务项目根目录运行；`local` 和 `health-check` 分别是环境 key 和场景 ID 示例，应替换为项目中实际配置的值。macOS / Linux 可使用以下命令：

```bash
# 启动工作台
node ./scenario-test/.scenario-test/scenario-test-cli.cjs serve \
  --config ./scenario-test/scenario.config.js --port 4300

# 执行指定场景
node ./scenario-test/.scenario-test/scenario-test-cli.cjs run \
  --config ./scenario-test/scenario.config.js --env local --scenario health-check

# 体检
node ./scenario-test/.scenario-test/scenario-test-cli.cjs doctor \
  --config ./scenario-test/scenario.config.js
```

### 导入真实流量

把浏览器 Network 面板导出的 HAR 或后端给出的 curl 示例转成可编辑的场景草稿。以下命令从**业务项目根目录**运行，输出位置明确指定在场景测试目录中：

```powershell
# HAR：过滤静态资源/OPTIONS，每个 API 请求生成一个 step
node .\scenario-test\.scenario-test\scenario-test-cli.cjs import --har session.har --output scenario-test/scenarios/imported-har.js

# 单条 curl：生成单步骤草稿，并在终端打印可直接粘贴的 step 片段
node .\scenario-test\.scenario-test\scenario-test-cli.cjs import --curl 'curl -X GET https://api.example.com/orders' --output scenario-test/scenarios/imported-orders.js

# 只要指定主机、最多导入 10 条，或自定义输出文件
node .\scenario-test\.scenario-test\scenario-test-cli.cjs import --har session.har --host api.example.com --max-entries 10 --output scenario-test/scenarios/imported-filtered.js
```

`import` 的默认输出目录及 `--output` 均相对于执行命令时的当前工作目录，而不是配置文件目录。未指定输出时会生成 `scenarios/imported-<时间戳>.js`；显式指定已存在的输出文件会覆盖它。场景 ID 由输出文件名生成。

`Authorization`、`Cookie`、API Key 等可识别的敏感头和查询参数会替换为 `{{vars.*}}` 占位；二进制或 multipart 请求体会省略。**请求体以及未识别的自定义敏感字段可能原样写入草稿**：生成后、提交前请检查凭据、个人数据及业务数据。通过环境变量等项目已有方式提供真实凭据，避免写入配置文件或命令历史。草稿中的状态码、动态字段和业务断言也需要人工确认。

将生成的文件加入 `scenario-test/scenario.config.js` 的 `scenarios` 清单；`url` 相对于配置文件所在目录。以下对应上面的 curl 示例：

```js
scenarios: [
    { id: "imported-orders", name: "导入订单请求", url: "scenarios/imported-orders.js" }
]
```

若输出目录与配置文件目录不同，需要按配置文件位置调整 `url`。确认目标环境和请求内容后，再执行该场景。

### 体检

```powershell
node .\scenario-test\.scenario-test\scenario-test-cli.cjs doctor `
  --config .\scenario-test\scenario.config.js
```

## 场景示例

下面演示一个只读健康检查。接口路径和响应字段仅为示例，使用前请按实际接口调整。

1. 创建 `scenario-test/scenarios/health-check.js`：

```js
ScenarioTest.registerScenario("health-check", ScenarioTest.defineScenario({
    name: "健康检查",
    steps: [
        {
            name: "检查服务状态",
            method: "GET",
            path: "health",
            status: 200,
            assertions: [{ path: "status", equals: "UP" }]
        }
    ]
}));
```

2. 在 `scenario-test/scenario.config.js` 中，按实际情况设置 `envs` 中对应环境的 `baseUrl`，并将场景加入 `scenarios` 数组：

```js
{ id: "health-check", name: "健康检查", url: "scenarios/health-check.js" }
```

配置中的 `id` 必须与 `registerScenario` 的 ID 一致。之后可用上方 [执行场景](#执行场景) 中的命令运行。

## 自定义下载源

安装脚本的 `-Source` / `SCENARIO_TEST_SOURCE` 使用可通过 HTTP(S) 访问的 URL 前缀，需提供以下 4 个运行时文件：

- `scenario-test-cli.cjs`
- `scenario-test.umd.js`
- `scenario-test.d.ts`
- `scenario-test-capabilities.json`

直接调用 `init` 时，`--library-url` 也是这些文件的下载 URL 前缀；CLI 优先使用本地运行时文件，缺少时才从该地址下载。`AI_SCENARIO_PROMPT.md` 和 `SCENARIO_PATTERNS.md` 由 `init` 生成在 `.scenario-test/`，无需放在下载源。

## 项目目录

```text
scenario-test/
├─ .scenario-test/                 # AI 规则与固定版本运行时副本（init 生成）
├─ scenarios/                      # 按业务功能组织的场景（由 AI 维护，非 init 生成）
├─ plugins/                        # 可选：项目专属 Node 插件（按需创建）
├─ scenario.config.js              # 环境、变量和场景清单（init 生成骨架）
├─ index.html                      # 浏览器工作台入口（init 生成）
└─ start-scenario-test.cmd         # Windows 双击启动入口（init 生成）
```

初始化配置使用项目内类型声明，接入后即可获得提示：

```js
/// <reference path="./.scenario-test/scenario-test.d.ts" />
```

`scenario.config.js` 和 `scenarios/` 应随业务项目提交；`.scenario-test/` 是固定版本运行时副本，团队可选择一并提交以便 CI 直接运行，或在 CI 中先执行安装脚本。无论哪种方式，都不要把真实凭据写入这些文件。

## 核心能力

### 场景编写

- 声明式 HTTP 场景 DSL，支持变量、提取、断言、条件和重试；`when` 可基于已提取变量（`vars`）、本次 run 共享变量（`suite`）、上一步响应体（`lastResponse`）或状态码（`status` / `target: "status"`）跳过步骤。
- `retryUntil.retryOn` 可选 `assertion`（默认）/`error`/`timeout`，服务刚启动时的网络错误和单次请求超时也能继续轮询；`intervalFactor` / `maxIntervalMs` 支持指数退避。
- `extract` 支持 `scope: "suite"`，把登录 token 等结果写入本次 run 的共享命名空间，后续场景用 `{{suite.<name>}}` 引用；每个场景以启动时的快照运行，结束时合并（并发时按完成顺序，同名键后完成者覆盖）。`suite` 不跨 run、不建立显式依赖。
- `from: "headers"` 的首段头名大小写不敏感；`path` 支持 `[*]` 通配段，可产出数组并直接用于 `length`/`includes`/`each` 断言。

### 工作台与运行

- 浏览器工作台与 Node.js CLI 使用同一套场景；`serve` 按浏览器当前环境逐请求路由，同源代理免 CORS。
- `run` 支持 `--concurrency`、`--bail`、`--data`、`--junit`、`--cookie-jar`、`--tag`、`--fail-on-skip`；`manual: true` 场景默认不参与 `--all`。
- `run --json` 输出结构化结果，stdout 纯净、进度与结论走 stderr，失败时仍输出完整 JSON 并返回非零退出码。

### 诊断与集成

- `doctor` 校验配置、场景、运行时版本和 SHA256 指纹；`capabilities --json` 输出机器可读能力清单。
- `import --har` / `import --curl` 把真实流量或 curl 示例转成场景草稿；静态资源与预检会被过滤，敏感头和查询参数替换为 `{{vars.*}}` 占位，二进制/multipart 请求体会省略并注明。
- 还支持 `shape` 结构断言、`always` 清理步骤、文件上传、响应保存和自定义 Node 插件。

完整示例见 [`examples/complete`](examples/complete)；DSL 能力以项目内 `.scenario-test/scenario-test-capabilities.json` 为准（本仓库由 `src/contract.js` 生成）。更多文档：[适配器指南](docs/ADAPTER_GUIDE.md)、[示例索引](examples/EXAMPLES_INDEX.md)。

## 安全

- 场景文件是可执行代码，只加载可信来源。
- 不要提交生产凭据、个人数据或真实 Token。
- CLI/CI 优先通过环境变量提供敏感值。
- 浏览器本地存储适合受控联调环境，不应保存生产凭据。

详细说明见 [SECURITY.md](SECURITY.md)。

## 升级

全局 Skill 和每个业务项目的运行时分别维护。更新 Skill 不会更新业务项目；普通的生成或执行请求也不会自动升级已有运行时。

### 更新全局 Skill

Skill 按 Git Tag 钉版本安装，升级时**把 Tag 换成目标版本重新安装**即可（覆盖同名 Skill）：

```bash
npx skills add duyiliu/scenario-test#v0.11.1 --skill scenario-test -g
```

未钉版本（安装时省略 `#`）的安装可执行 `npx skills update scenario-test -g` 跟随默认分支。其他安装方式按所用工具的更新流程操作；更新后建议开启新会话，再检查工具是否加载了新版 Skill。当前内置运行时版本可查看 `<Skill目录>/runtime/release.json` 的 `version`。

### 升级业务项目运行时

在目标业务项目根目录，向 AI 明确提出：

```text
请将当前项目的 scenario-test 运行时升级到最新发布版本，
保留现有配置和场景，并在升级后运行 doctor。
```

Skill 会先确认当前项目、现有版本锁、目标发布版本和安装来源，再执行升级。升级前应保存或备份相关未提交改动；默认保留 `scenario.config.js` 和 `scenarios/`，并刷新 AI 规则和模式库。版本或契约不一致、运行时缺失或与锁定指纹不一致时会刷新运行时副本。不要随意传 `--force`，它会覆盖与初始化模板同名的已有文件，包括配置文件。

升级后检查 `doctor` 的版本锁、能力清单和配置结果；有 FAIL 时先排查，不能只凭安装命令退出成功认定升级完成。`doctor` 是静态体检，不会替代场景实际执行。各业务项目需要分别升级。

### 手动升级与内网备用

需要手动操作时，先核对目标发布版本，在业务项目根目录重跑[固定版本安装脚本](#skill-使用的固定版本安装脚本)（`--no-input` 保留配置与场景，仅刷新运行时和 AI 规则）。存量 `package.json` 中若有 `@yc_yzkj/scenario-test` 依赖，那是旧的 npm 接入方式——npm 包已冻结不再更新，请改用安装脚本并移除该依赖。

无外网时，先准备对应版本的安装脚本及[内网运行时文件](#自定义下载源)，例如：

```powershell
.\install.ps1 -Source "https://gitlab.example.com/group/project/-/raw/v0.11.1/dist"
```

升级完成后执行：

```powershell
node .\scenario-test\.scenario-test\scenario-test-cli.cjs doctor --config .\scenario-test\scenario.config.js
```

历史变更见 [CHANGELOG.md](CHANGELOG.md)。

## 维护者

要求：Node.js 20+（构建链含 Tailwind CSS 4 的 oxide；业务项目运行时消费仍为 Node.js 18+）。

```powershell
npm install
npm run build
npm run test:unit        # 单测/集成（tests/*.test.js）
npm run test:browser     # Playwright 浏览器测试
npm run check:all        # 构建 + unit + browser + ui-style + 行尾审计
```

CI 在 GitHub Actions 上覆盖 Node 18/20/22 × Ubuntu/Windows 的单测矩阵、构建与类型自检、浏览器测试、视觉回归和行尾审计，见 `.github/workflows/ci.yml`。

发布流程见 [docs/RELEASING.md](docs/RELEASING.md)。

本项目采用 MIT License。

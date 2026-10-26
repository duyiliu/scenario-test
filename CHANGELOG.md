# Changelog

All notable changes to this project will be documented in this file.


## [Unreleased]

### DSL 与诊断

- 配置未知键与 baseUrl 定义期校验（contract v12 → v13，issue #61）：`contract.config` 新增 `configKeys`，`defineConfig` 按契约对配置顶层、`envs[]`、`variables[]` 做未知键校验，`requestTimeoutsMs`/`baseUrll`/`require` 等拼写错误立即报错并提示正确字段名；`envs[].baseUrl` 与顶层 `baseUrl` 声明时必须是 `http(s)://` URL，并去首尾空白、纯空白按缺省处理（缺省时按顶层 `baseUrl` 回退，浏览器工作台仍可回退当前页面地址），`variables[].required`/`label` 补类型校验；浏览器工作台消费的 `storageKeys` 纳入白名单。历史配置中的顶层 `envVars` 保留兼容。`doctor` 新增 `config-keys`/`base-url` FAIL/WARN：未知键、非法 baseUrl 直接 FAIL，环境与顶层都缺 baseUrl 时 WARN 提示 `CLI run 需要 --base-url`；专项诊断只依据 defineConfig 写入的结构化错误码，不按错误消息子串误报。capabilities JSON/文本、`dist/scenario-test.d.ts` 与 contract 类型同步投射。`maxResponseBytes`/`maxUploadBytes` 同样纳入白名单，与引擎/CLI 实际消费的配置字段一致。

### CLI

- 新增 `run --concurrency <N>`（contract v12 增量，`contract.cli.options` 投射）：多场景并发执行，
  默认 `1` 保持既有串行行为；场景内步骤仍严格串行。并发模式下每个场景的进度行先写入独立缓冲、
  场景结束时整块输出，避免 `[PASS]`/`[FAIL]`/`[RETRY]` 交错；`--json` 报告按配置清单顺序收集
  （不按完成顺序），汇总统计与退出码逻辑不变。`onStep`/`onAttempt` 并发安全由调用方保证；
  进程级共享的适配器注册表在并发下要求 `matches`/`execute` 可重入，详见 `docs/ADAPTER_GUIDE.md`。
  `nodePlugins` 的 `transformScenario`/`afterScenario` 也会被并发调用，同样要求可重入无状态；
  任一场景执行链（含插件钩子）拒绝均中断调度并以非零退出码终止，与串行一致。

- `serve` 代理目标回退（issue #61）：配置存在 `envs` 但所选环境未声明（或为空）`baseUrl` 时，回退顶层 `config.baseUrl`，与 `run`/`doctor` 的回退口径一致，不再得到空代理目标。

- `run --vars key=value`（可重复，contract v11 → v12）：临时注入/覆盖配置变量，多组按出现顺序叠加（同名后者覆盖），命令行优先级最高（`scenario.vars < config.vars < options.vars`）。值支持 `{{ }}` 模板；非法 `key=value` 报错并给出示例；保留变量（`runId`/`runNo` 等）复用 `assertNoReservedVars` 拒绝。同步投射 capabilities JSON/文本、`--help`、`dist/scenario-test.d.ts`、AI Prompt 与项目 README 模板。

- `run --timeout <ms>`：透传 `runOptions.requestTimeoutMs` 覆盖配置 `requestTimeoutMs`，用于临时排查慢接口；非法（非正数/非数字）报错，短超时配合慢响应返回结构化 `TIMEOUT`。
### 安全与诊断

- 敏感变量/认证头报告脱敏（issue #90）：CLI 失败 diff、失败响应体、`run --json` 报告与浏览器工作台步骤详情/运行时变量面板/Markdown/JSON 报告统一调用 `maskSecret`。变量名或头名命中 `token|secret|password|passwd|auth|credential|api[-_]?key` 时按 `前4...后4`（≤12 字符为 `***`）展示；命中敏感变量的断言 expected/actual、响应体回显与 URL query 敏感值同样脱敏，普通变量与普通字段保持原样。浏览器凭据输入框改用 `core.isSecretName`，与 CLI 共用同一名单。脱敏仅作用于输出视图，`runScenario` 编程接口返回值仍保留原始调试数据。

### 产物

- `node.js` 入口不再透传 `index.js` 的 `createApp`：改为逐项枚举核心导出 + 浏览器占位函数（`typeof` 仍为 `function`，调用时报「仅在浏览器环境可用」而非 `document is not defined`）。Node/CLI 产物随之不再打进浏览器工作台与 Tailwind 内联样式（此前 `cli.js` 把 `import * as ScenarioTest` 整个命名空间对象传入 loader/插件工厂，esbuild 无法 tree-shake）；`scenario-test.cjs`/`scenario-test-cli.cjs` 显著瘦身。UMD/ESM 浏览器产物的 `createApp` 不变。

### 引擎与断言

- `retryUntil.retryOn`（contract v12 → v13）：可选 `assertion`（默认）/`error`/`timeout`。包含 `error`/`timeout` 时，`executeHttp`/适配器抛出的网络错误（ECONNREFUSED、ENOTFOUND、TLS 等）与单次请求超时不再立即跳出轮询，而是记录最近一次错误后继续尝试，直到 `maxAttempts`/`maxElapsedMs` 用尽；用户取消始终立即终止。`maxElapsedMs` 超限的错误信息补充已尝试次数与最后错误；显式启用 `error`/`timeout` 时，重试等待间隔、单次在途执行与异步 `onAttempt` 均受剩余总时限约束（总时限后迟到的 HTTP 响应不再触发 `saveResponseAs` 落盘，也不让慢请求 PASS）；`onAttempt` 回调新增 `errorType`/`errorMessage`，CLI/工作台可显示连接失败进度；`retryUntil` 未知键定义期拒绝，避免拼错 `retryOn` 被静默忽略。未声明 `retryOn`（默认 assertion）时仅在尝试之间检查总时限，行为与旧版完全一致（耗时恰好等于 `maxElapsedMs` 仍发起下一次尝试，超过后返回的成功响应仍可通过）。

- `equals`/`notEquals`/`includes`/`oneOf`/`each` 深比较支持 BigInt 等 JSON 不可表示值：`stableStringify` 以 `bigint:` 前缀标记区分 `1n`/`1`/`"1"`，此前遇 BigInt 抛 TypeError 使断言失败升级为步骤 ERROR，与 includes/oneOf 已修的口径不一致。
- `matches` 断言正则编译缓存：retryUntil 轮询与同值静态正则不再每次尝试重复 `new RegExp`；按解析后的期望值字符串键控（模板值变化互不串扰），有界 FIFO。
- `evaluateAssertion` 执行期校验 WeakSet 去重：同一定义对象在轮询重试中不再重复 `validateAssertion`；each 子断言为每次 resolve 新建对象，仍逐次校验，口径不变。

### CLI/加载

- `loadScenarioFile` 场景缓存按「id + 文件路径」判定：同进程加载同名 id 的另一个文件不再返回首个文件的陈旧场景，同名不同路径时重新执行文件、由 `registerScenario` 后注册覆盖。

### 浏览器工作台

- 报告面板隐藏期间（统计页签激活）`renderReportPanel` 只更新失败徽标与页签禁用态，跳过 `buildOverallReport` 与 innerHTML 重建——执行循环每步全量重建让报告构建退化为 O(n²)；页签切回或失败自动跳转时补一次全量渲染。`setSidePanelTab` 新增 `preservePanel` 选项供诊断面板（`showDiagnosticError`）跳过重建。
- 移除 `runtime.js` 中被后定义遮蔽的重复 `expandStepDetails`（旧定义从不生效，属死代码）。
## [0.8.0] - 2026-10-24

### Migration Guide: v0.7.1 → v0.8.0

本版本把多处「静默失败」收紧为定义期报错，并使适配器超时生效。正常写法的场景不受影响（114 个下游真实场景实测 0 违规、12 组 v0.7.1 典型写法结果一致）：

1. **场景/步骤未知键**：拼错（`assertion`/`timeoutMS` 等）或自定义元数据键（`description`/`tags` 等）定义期报「包含未知键」——修正拼写；元数据请放注释。适配器步骤的私有配置键不受影响。
2. **适配器 `timeoutMs`**：此前声明被忽略，现生效——慢适配器按真实耗时声明（默认上限 30s，可调大）。
3. **数组 query 参数**：`tags: [1,2]` 从 `tags=1%2C2` 变为 `tags=1&tags=2`（标准数组语义）；后端按旧逗号格式解析的需确认。
4. **`params` 与 `request.params` 双写**：定义期要求二选一。
5. **`run --json`**：stdout 变为纯 JSON（进度走 stderr）；解析 stdout 文本的 CI 脚本需改用文本模式或解析 JSON。

**契约版本 v8 → v11**（v9 `run --json`、v10 `when` 扩展、v11 未知键校验）。


### DSL

- 场景顶层与步骤顶层未知键定义期拒绝（contract v10 → v11，issue #26 B1；master 的 v9/v10 已被 run --json/when 扩展占用）：拼错的 `assertion`/`extracts`/`retryuntill`/`timeoutMS` 此前被 `defineScenario` 静默接受——业务断言消失、重试/超时失效，接口返回 2xx 即假绿。现消费既有的 `contract.scenario.keys`/`stepKeys` 名单校验（不另写副本）；未声明 HTTP 执行面的步骤（matches 自动分发适配器）与显式 `adapter` 步骤仍可携带适配器私有配置键，但拼写/大小写疑似 DSL 字段的键仍然拒绝。

- 步骤 `request` / `params` / `request.params` 必须是对象（issue #26 B3）：非对象此前在运行期被静默忽略（headers/body/method 或整个 query 丢弃），请求照发且可能假绿；同时声明 `params` 与 `request.params` 时定义期要求二选一（运行期只取 `params`，另一份静默失效）。

- `contract.config.environmentKeys` 补 `authorization`（issue #26 F3）：CLI `selectEnvironment` 与浏览器 `getEffectiveAuthorization` 一直消费 `environment.authorization`，此前契约未投射，AI/工具侧不可见。

- 浏览器工作台移除死字段 `scenario.iterations` 的读取：引擎/工作台从不写入、也不在契约中，B1 未知键校验一并明确去留（统计口径完全由 `state.steps` 推导）。

- `when` 对象形式扩展来源（contract v9 → v10）：新增 `from: "lastResponse"`（上一步响应 body，`path` 子路径口径与 extract `from: "body"` / 模板 `{{lastResponse.*}}` 一致）与 `from: "status"`（上一步 HTTP 状态码，数值），并支持等价的 `target: "status"`。此前「按上一步响应状态/响应体决定是否执行下一步」需先 `extract` 临时变量再让 `when` 引用变量。未新增其他响应来源（headers/bodyText/duration 仍仅用于 assertions/extract），来源名称与断言 `from`/`target` 白名单保持可映射关系。第一步（无上一步响应）引用 `lastResponse`/`status` 时按来源缺失处理：条件不成立、步骤 SKIP，不抛错中断场景。投射同步：capabilities JSON/文本、`dist/scenario-test.d.ts`（`WhenSource`/`WhenTarget`）、AI Prompt/模式库/项目 README 模板、内部使用指南。master 上 `run --json` 已先行占用 contract v9，故本次新增来源按不可变契约继续递增到 v10。

### CLI

- `run --json` 输出机器可读执行结果：单场景直接输出 `runScenario` report，多场景顶层包 `{ "scenarios": [<report>, ...] }`；`--json` 下所有人类可读进度（`[RETRY]`/`[PASS]`/`[FAIL]`/结论行等）改走 stderr，stdout 只承载 JSON 文档。退出码与 JSON 正交：断言/场景失败仍输出完整 JSON 并返回非零退出码。`contract.cli.options.json` 描述同步覆盖 run（contract v8 → v9）。

### 引擎

- 适配器步骤的 `timeoutMs` 生效（issue #26 B2）：此前只有 `executeHttp` 有超时链路，`executeAdapter` 完全无超时（`retryUntil.maxElapsedMs` 只在 attempt 之间检查）——挂死的适配器会让场景永久卡住。现复用 `createRequestSignal` 语义并与 signal 竞速（适配器可能完全不看 signal），超时按结构化 `TIMEOUT` 归类并透出 `method/path/timeoutMs`；超时后 `onError` 钩子仍被调用。
  **⚠️ 存量影响（行为变更）**：此前适配器步骤声明的 `timeoutMs` 被忽略、且不受默认 `requestTimeoutMs`（30s）约束——两类存量场景升级后可能从 PASS 变 TIMEOUT：(1) 声明了较小 `timeoutMs` 但适配器实际耗时更长的步骤；(2) 适配器单次执行超过 30s 的步骤（未显式声明 `timeoutMs` 时）。升级前请用本版本回归全部适配器场景，慢适配器按真实耗时调大 `timeoutMs`。

- `AdapterExecutionError` 改用 `cause` 链接原始错误并透传结构化标记：适配器内部抛出的 `scenarioTimedOut`/`scenarioContext` 此前被包装吞掉，超时步骤降级为无请求现场的 ERROR；现按 TIMEOUT 归类并透出 method/path/request。失败消息的 cause 透出（`（ECONNREFUSED）` 等）增加去重：cause 文本已被包装进 message 时不再重复拼接。

- `retryUntil.intervalMs` 显式 `0` 语义修正：此前 `intervalMs || 2000` 把显式 0 静默吞回默认 2000ms；现按「0 = 按最小间隔执行」钳到下限 100ms（与定义期 `≥0` 校验口径对齐），未声明/非法值仍按默认 2000ms。

- `retryUntil` 轮询 `delay` 修复 abort 监听泄漏：正常到期只 resolve 不摘监听，监听器随尝试次数在同一父 signal 上累积——工作台整场执行复用单个 `abortController`、长轮询场景在 Node 下 ≥11 个监听器即打 `MaxListenersExceededWarning` 污染 stderr，亦构成内存泄漏。现到期即摘除，与 `readBodyChunks`/`createRequestSignal` 的清理口径对齐。

- `each` 子断言执行期校验收敛：子断言定义在单次 `evaluateAssertion` 内由 `resolve()` 新鲜生成且不逃逸同步遍历，逐元素 `validateAssertion` 是纯浪费——N 元素 × M 子断言次校验降为 M 次（校验/求值输出完全同口径），大数组逐项断言的 CPU 开销显著下降。

- `stableStringify` 单趟组装：对象分支 `filter`+`map` 各序列化一次同一子树，每层 2× 冗余在深层嵌套上指数放大；`includes`/`oneOf` 同步把 actual/expected 的稳定序列化移出逐项比较循环。

- `resolveString` 无模板文本快速返回：`{{` 子串预检一次即返回，跳过整串 match+replace+test 三轮正则；`tokenizePath` 分词结果按路径字符串缓存（有界 FIFO、缓存数组冻结防改写污染）——模板/断言/extract 裸路径在多步骤与轮询重试间反复分词。

- `tokenizePath` 兼容性回归修复：缓存内部数组仍然冻结（防调用方改写污染），但对外按公开声明 `string[] | null` 返回**可变副本**——调用方 `push`/`splice` 不再在 ESM/严格模式下抛 `TypeError`，公开 API 约定与旧版一致。

- `includes`/`oneOf` 序列化短路：仅在累计结果仍可能通过、且候选/实际集合非空时才做稳定序列化——`oneOf: []`、空数组 `includes` 恢复为普通断言失败，不再因不可 JSON 序列化的实际值（如适配器返回的 `body: 1n`）把断言失败升级为步骤异常；前序操作符已失败时同样跳过后续无谓序列化。

- 断言键白名单查询 Set 化（每次求值都过 `validateAssertion`）；`gt/gte/lt/lte` 循环复用 `contract.assertions.numericOperators` 名单，不再手写第二份。

### 核心

- `joinUrl` 放行协议相对 URL（`//cdn.example.com/x`，issue #26 B4）：此前只识别 `^https?://`，前导 `//` 被 strip 后拼进 baseUrl，请求发往错误主机；`executeHttp` 的「绝对地址不发环境凭据」判定同步覆盖协议相对写法。

- `buildUrl` 数组参数展开为重复 key（`tags=1&tags=2`，issue #26 B5）：此前 `String([1, 2])` 拼成 `tags=1%2C2`，把 `"1,2"` 当单值传给后端，与 Spring 等主流服务端数组语义静默偏差。执行期全局 query 注入与浏览器 cURL 预览共用同一 `queryPairs` 实现（已导出，d.ts 同步）。

- `validateAdapterResponse` 的 `headers` 检查不再把 `null` 当对象放过（issue #26 小观察）。

### 浏览器工作台

- 「复制 cURL」shell 转义补齐（issue #26 B6）：header/URL/body 统一改用 POSIX 单引号包裹 + `'\''` 转义，双引号内的 `$VAR`/`$(...)`/反引号不再被 bash/zsh 展开——复制出的命令与工作台实际发送值保持一致，也封堵变量值借复制粘贴注入命令。

### 诊断

- `doctor` 的 Node 版本区间比较修复缺省段：`">=18"` 这类只声明主版本的范围把缺省 minor/patch 解析成 `NaN` 参与比较（NaN 比较恒 false）——**所有 v18.x 在 node-version 检查被判 FAIL**，恰好击穿 engines 声明的支持下限（仅主版本高于下限时因短路偶然正确，故存量未暴露）；`v18.17.0` 对 `>=18.17` 的边界等值同病。现缺省段按 0 参与比较，恢复 `>=` 语义。

- `includes` 断言命中 plain object 实际值时不再只呈现 `actual="[object Object]"` 的确定性失败：保持失败口径不变（历史恒 false），断言结果新增可选 `reason`，点明 `includes` 不支持对象类型实际值并引导改用 `equals`（对象深比较）或对具体字段 `path` 断言；CLI、工作台断言表与 Markdown 诊断报告同步透出。数组/字符串分支行为不变，不涉及契约变更。

### 工程

- `registry.normalizeGlobals` 与 CLI `SCENARIO_GLOBALS` 解析复用 `core.normalizeGlobalParam`，消除两处同形规范化副本。

- Tailwind CSS 3.4 → 4.3（#5）：构建链依赖从 `tailwindcss`（v3 PostCSS 插件）换成 `@tailwindcss/postcss`，`build.mjs` 输入改为 CSS 优先的 `@import "tailwindcss" source(none)` + `@source` 显式指向三个 UI 源文件（与原 `content` 列表一一对应）。v3 `important: "#scenario-test-root"` 在 v4 无等价配置（v4 important 只做 `!important`），改由构建内联 PostCSS 步骤对 `@layer utilities`/`components` 的选择器统一加 `#scenario-test-root` 前缀，theme/base（变量与 preflight）保持全局，与 v3 作用域口径一致。默认外观差异逐项还原：`@theme` 钩子恢复 `--default-ring-width: 3px` 与 `--default-ring-color: rgb(59 130 246 / 0.5)`，base 层补 `border-color: var(--color-gray-200)`（v4 默认改为 1px 与 currentColor）；UI 源文件 `outline-none` 更名 `outline-hidden`（v4 里 `outline-none` 变为彻底移除 outline，旧语义归 `outline-hidden`）。其余旧类（`flex-shrink-0`、`rounded`、`shadow`、`placeholder-slate-*`、`divide-*`、`space-*` 等）v4 均有兼容输出无需改名。同步收益：此前 v3 里不存在而静默失效的 `shadow-2xs`/`shadow-xs` 类在 v4 恢复生效。`npm audit` 8 个漏洞（6 high/2 moderate，全部位于 tailwind 3.x 传递链与 source-map-js）随升级清零；仓库构建链要求随之升为 Node.js 20+（@tailwindcss/oxide），业务项目运行时消费仍为 Node.js 18+。

- 行尾策略从「仅声明」升级为「声明 + 审计」：`.gitattributes` 补上 `dist/**`、`src/version.generated.js`、`src/browser/tailwind.generated.js` 的显式 LF 口径与更多二进制扩展名；新增 `npm run check:eol`（`scripts/check-eol.mjs`，只读 `git ls-files --eol`）检测索引/工作区行尾漂移，并作为 `tests/eol.test.js` 纳入 `npm test`——CRLF 幻影（`git status` 标 M 而 `git diff` 为空）会在测试中显式失败并给出修复命令，不再靠人工 `git checkout --` 取证。

- 移除 `NEXT_STEPS.md` 交接文件：轮次交接改由提交信息与 CHANGELOG `## [Unreleased]` 承载，`docs/OPTIMIZATION_BRIEF.md` 的工作循环同步更新。

### 测试基建

- `build.mjs` 的 dist 发布与孤儿清理抽到 `scripts/build-dist.mjs`，fs/sleep/pid 存活判断均可注入；新增 `tests/build.test.js` 用 EPERM 故障注入覆盖 rename 重试（250ms × 3）、持续失败回退 `cpSync` 到 swap、失败回滚还原旧产物，以及孤儿目录仅在 pid 确认死亡（ESRCH）时清理、存活/pid 复用与 EPERM 一律不误删、backup 自动还原遇活跃构建推迟。相比 `mock.module`，依赖注入无需加载 esbuild/tailwind 构建依赖即可确定性复现瞬时 OS 锁。

- `doctor.test.js` 子进程统一剥离 `*_proxy` 环境变量：宿主设了 `HTTP_PROXY` 等代理时，Node undici `EnvHttpProxyAgent` 会向 stderr 打 `UNDICI-EHPA` 实验警告，导致「stderr 应为空」类断言在本机环境必然失败。

### 决策

- `generatedVars.enum` 维持「同一 `runId` + 变量名恒得同值」的确定性派生语义，**不引入** `pick: N`（数组模式）或等价契约扩展。现有场景只要求单值枚举（轮内稳定、跨轮随 `runId` 变化），确定性派生已覆盖；多值形态还须先定义 N 个值的口径（同轮去重互异，还是允许重复），属尚未验证的需求。故本次不改 `contractVersion`、`contract.js`、dts/AI Prompt 投射、浏览器 `runtime.js` 的 enum 分支，两处类型名单锁（`tests/contract.test.js`、`tests/cli.test.js`）保持原样。真实「同轮同变量多值」需求出现时再按契约变更流程启用：先定 N 值口径，再递增 `contractVersion` 并同步投射与名单锁。

### 文档

- 补声明 `from: "headers"` 配 `path` 时首段头名按大小写不敏感匹配（与 `header` 简写、extract/断言同口径，`from: "response"` 与模板 `lastResponse.headers.*` 仍精确匹配）：contract 增加断言/提取说明并投射到 capabilities 与 d.ts，AI Prompt、模式库、项目 README 模板、根 README 示例及规则预览同步澄清；行为不变，`contractVersion` 维持 8。


## [0.7.1] - 2026-10-12

### DSL

- `assertions`/`when`/`extract` 的 `from` 与 `target` 定义期白名单校验（contract v7 → v8）：未识别值此前在运行期静默落到 body 分支——`target: "statu"` 这类拼错会在错误来源上求值，响应体恰好有同名字段时产生**假绿**。断言 `target` 只支持 `status`/`duration`、断言 `from` 只支持 `body`/`vars`/`headers`/`bodyText`、extract `target` 只支持 `status`、extract `from` 只支持 `body`/`headers`/`bodyText`/`response`。
- `extract` 定义期校验补齐（此前完全无校验）：必须是数组、每项是对象且 `name` 非空、`name` 不得撞保留变量、`required: true` 与 `default` 互斥、`from`/`target` 白名单、`path` 过严格分词。此前非对象项/缺 `name` 在运行期静默跳过（连 warning 都没有），拼错的 `from`/`target` 拖到运行期才错。
- 断言与 extract 的裸 `path` 定义期过 `tokenizePath` 严格分词：`a..b`、`a[]`、`["a"]b` 等畸形写法此前静默判缺，`exists: false` 断言因此**假绿**。`path` 中的 `{{ }}` 模板顶层一律定义期拒绝——path 按字面取键从不做模板解析（`exists:false` 会因此恒真），仅 `each` 子断言的 path 随期望值整体先解析再校验属合法用法。`path: ""` 按运行期 falsy 语义取整个来源，放行。`from: "headers"` 的首段头名宽松特性不受影响。
- `extract` 项键名白名单（`contract.extract.metaKeys`）：`heder`/`fromm` 等拼错键此前静默落到默认 body 来源，现定义期报「包含未知键」；`name`/`header` 中的 `{{ }}` 模板同为死写法（变量名/头名按字面使用不解析）一并拒绝，`required` 必须为布尔值（`required: "yes"` 此前静默降级为「非必需」，依赖 required 失败的场景照过）。
- 断言 `header` 简写定义期校验：必须是非空白字符串且顶层不支持 `{{ }}` 模板——头名按字面匹配不做解析，`{header:"{{vars.h}}", exists:false}` 会与 path 同理恒真假绿。
- `each` 子断言禁用响应级通道：`header`、`target`（status/duration）、`from:"headers"`/`from:"bodyText"` 在 each 内断言的是数组元素，`elementResponse` 的这些通道恒为 `undefined`/`""` 死值——`exists:false` 恒真假绿、`exists:true` 恒假。响应级断言请提升到顶层；each 内仅 `path`（元素自身）与 `from:"vars"` 合法，模板随期望值整体解析。
- `when` 非对象形式收紧：只放行对象断言、整串 `{{ }}` 模板（`{{vars.flag}}`，resolve 保真值，外层空白容忍与运行期同口径）与布尔值；`"false"`/`"0"`/数字/数组等误写定义期即拒（按真值判定恒真或恒假，通常不是本意——典型 AI 生成坑），`"pre {{vars.x}}"`/`"{{a}}{{b}}"` 等拼接模板同样拒绝（解析成非空串恒真）。
- `__proto__`/`constructor`/`prototype` 加入保留变量名单：extract 同名写入会触发 `vars.__proto__` setter 把服务端可控值挂进原型链污染后续断言；读侧 `{from:"vars", path:"__proto__", exists:true}` 此前恒真。现 `getByPath` 只导航自有键（继承成员不可见），extract/generatedVars/envVars/vars 声明同名一律报错。

### 安全

- `fileUpload`/`saveResponseAs`/`serve` 增加 realpath 边界校验：junction/符号链接指向工作区外时，词法 `path.relative` 检查放行但真实读写落到界外——fileUpload 可外泄界外文件、saveResponseAs 可向界外写文件。现对「最近存在的祖先」realpath 后拼回剩余段再判界内，根目录及其祖先链同样过 realpath（root 配在 junction 之下不误拒），`serve` 的静态文件服务同口径。

### 引擎

- `onStep` 回调抛错降级为该步骤 ERROR（附断言形态失败条目），与 `onAttempt` 同口径——此前回调 bug 会让 `runScenario` 整体 reject、调用方拿不到任何 report。对 SKIPPED 步骤抛错时同步清除 skipped 标记——否则该步既不计 failed 也不计 passedSteps，场景会报 SKIPPED/PASSED 而结果里躺着 ERROR 行（残留假绿）。
- fetch 拒绝时透出 `error.cause`（`ENOTFOUND`/`ECONNREFUSED`/证书错误等）——`TypeError: fetch failed` 不再掩盖真实网络原因。

### 浏览器工作台

- `generatedVars` 补齐 `idcard`/`luhn`/`phone`/`uscc` 四类型（v0.5.23 起 CLI 已支持、工作台一直缺失）；并将单定义赋值链收敛进 `core.applyGeneratedVar`，Node engine 与浏览器共用同一实现，双端不再可能各自漂移。

### 输出

- `escapeInlineText`/`formatFailureValue` 等输出转义补 U+2028/U+2029（Unicode 行分隔符）：`JSON.stringify` 不转义它们，支持这些字符的终端会渲染为新行，可伪造报告行/CI 命令行。现统一折为 `\uXXXX` 字面量。

### 能力投射

- `capabilities`/`dist/scenario-test-capabilities.json` 补齐 `assertions.from`、`extract.targets`、`extract.metaKeys`、`extract.default` 投射——contract v8 的新消费面此前对外不可见，AI/工具侧拿不到断言来源白名单与提取目标/键名单。

### 历史版本影响

以上问题除 U+2028/U+2029 转义（防线本身为 0.7.0 新增）外均为**历史版本存量问题**（含下游在用的 v0.5.23）：原型污染写入面、junction 越界、假绿校验盲区、浏览器造数缺型、`onStep` 崩轮在旧版全部存在——旧版（≤0.6.x）还没有任何输出注入防护，服务端返回 `::error::`/ANSI 序列可原样进 CI 日志。升级是唯一修复路径；已验证定义期校验不产生新的存量拒绝（下游 87 场景 0 违规）。

## [0.7.0] - 2026-10-12

### 构建

- `build.mjs` 换目录抗 Windows 瞬时锁并加失败回滚：旧 `dist` 先 rename 为 `dist.backup-<pid>`（rename 失败则全程未动，比「删旧再 rename」少一个丢产物窗口），`staging → dist` rename 被瞬时占用时按 250ms 间隔重试，仍失败回退 cp 到 `dist.swap-<pid>` 再 rename 就位——直接 `cp` 进 `dist` 会让读者看到逐文件半成品；任一步失败时 backup 自动还原（初始 backup rename 失败则直接中止，旧产物全程未动；回滚路径各步独立容错不互相阻断；还原失败明示 backup 路径供手动恢复），dist 不缺失；就位后 staging/backup 清理失败不影响发布。构建启动时按目录名内 pid 存活检测处理中断遗留目录：`dist.staging-*`/`dist.swap-*`/`dist.trash-*` 在 pid 确认死亡（`ESRCH`）后删除；`dist.backup-*`/`dist.restore-*` 不直接删——先经原子 rename 认领进本进程命名空间（两进程同时操作同一源目录只一个成功），dist 已存在则移入 `dist.trash-*` 再删（递归删除中断的残留永不进还原路径），dist 缺失且无其他活跃构建时才认领还原为 dist（`EPERM` 等一律视为存活不处理，防误伤其他权限上下文的并发构建）。并发安全不靠锁靠协议：dist 位置只会被原子 rename 换入完整产物、失败路径绝不向 dist 写半成品，因此回滚时 dist 存在即视为他人产物不删不还原（保留 backup 报错提示），杜绝「A 回滚误删 B 刚成功发布的 dist」；启动还原遇活跃构建自动推迟，撞名仅致本构建优雅失败重跑即可。

### CLI

- `run` 重试轮询输出 `[RETRY] <步骤名> 第 N/M 次未通过（status X，首个失败断言名），间隔后重试` 进度行——此前轮询在间隔内完全静默（10 次 × 数秒的步骤看起来像挂死）。引擎新增 `onAttempt` 运行回调（payload：`step`/`attempt`/`totalAttempts`/`intervalMs`/`status`/`failedAssertion`），`createEngine({ onAttempt })` 与 `createEngine({ onStep })` 引擎级默认回调同样生效（`RunOptions` 传入优先）；工作台轮询期间同步更新运行状态位。最终一次尝试或通过时不发。
- `run` 失败步骤自动输出截断的响应体原文：断言明细（expected/actual）之外补打 `响应体:` 分块，服务端错误 payload（业务错误码/错误消息）直接进 CI 日志，无需重跑或加 `saveResponseAs` 才能诊断。超过 2000 字符截断并标注「共 N 字符，截断显示前 2000」，防巨型 HTML 错误页刷爆日志；含控制字符（ANSI 转义序列、`\r`、C1 等）的行经 JSON 转义输出，服务端可控内容无法在 CI 终端执行转义注入；行首 `::xxx::`（GitHub Actions 新格式）经整行 JSON 引号透出破坏行首识别，`##` 系标记（`##[` GitHub 旧格式、`##vso[` Azure DevOps、`##teamcity[` TeamCity）按整行 IndexOf 识别、引号挡不住——标记字节序统一打散转写；同一防护覆盖 `[FAIL]` 行的 `name`/`method`/`path`/`status`、`[WARN]`、`[RETRY]` detail、`#` 场景标题、断言名（含 each 子断言名）、`expected`/`actual`/diff 分块、错误消息与堆栈输出等全部服务端可控输出面（`result.status`/`result.path` 可由适配器返回值或 `extract` 提取值注入，`\n` 折为字面量防伪造命令行；stderr 的 `error.stack`/`message`/`hint` 逐行同口径处理；库内部诊断输出（适配器 onError 钩子异常、dispose 清理失败 warn）共用同一转义防线）；`bodyText` 为空但适配器返回结构化 `body` 时以 JSON 兜底输出；`saveResponseAs` 步骤改打「响应体已保存至 <路径>」提示（凭运行时内部标记确认真实发生过保存，业务响应/适配器 body 恰好含 `savedTo`+`size` 字段不吞原文）。请求体与请求头刻意不输出——注入后的 `Authorization`、登录密码类字段不应进 CI 日志；通过/跳过步骤不输出。响应体本身含 token 等敏感信息时可设环境变量 `SCENARIO_NO_BODY_PRINT`（非空即生效）整体关闭输出。
- `run --scenario` 支持逗号分隔多选（如 `--scenario login,order`），按场景 id/name/url 逐项匹配，执行顺序保持配置清单顺序，manual:true 场景显式点名即可执行。任一选择项未命中即整体报错并点名缺失项与可选清单（all-or-error，避免 CI 拼写错误静默少跑）；`--scenario` 值为空白时报「值为空」而非回落默认场景。

### DSL

- 模板 `{{ }}` 内的表达式写法定义期即拒绝：模板只做路径取值，`{{vars.a > 0}}`、`{{!vars.x}}`、`{{vars.a ? b : c}}`、`{{vars.fn()}}` 等按 jinja 习惯写出的比较/逻辑/三元/函数调用会被当成键名查找并静默得到空串——`when` 静默跳过、断言静默失败、`extract` 静默 `undefined`。现 `defineScenario`/`defineConfig` 遍历全部字符串值，用与运行期 `getByPath` 相同的严格分词判定：裸段含 `>` `<` `=` `!` `&` `|` `?` `:` `(` `)` 即报「不允许使用运算符」并指引改用断言/when 对象形式；引号键（`vars["a>b"]`、`vars.obj["a]>b"]`）、连字符键、普通文本中的运算符字符不受影响，`[0 > 1]`/`[fn()]`/`["a" > "b"]` 等伪下标同样拒绝。
- `GET`/`HEAD` 步骤声明请求体（`request.body` / `request.fileUpload`）定义期即拒绝：此前 `request.body` 被 `executeHttp` 静默丢弃（以为发了其实没发），`fileUpload` 则交给 fetch 抛底层英文错。报错指引改用 `POST`/`PUT`/`PATCH` 或把参数放进 `params`。`step.method` 的模板写法（`method: "{{vars.m}}"`）定义期直接拒绝——`step.method` 不经 `{{ }}` 解析会按字面方法名发送，恒为死写法；动态方法应写在 `request.method`（运行期解析，定义期跳过相容校验）。显式 `adapter` 声明的步骤跳过 HTTP 相容校验——`request` 语义由适配器自行定义，`step.method` 模板对适配器亦有效（`execute` 收到的是 `{{ }}` 解析后的副本）；`adapter` 字段存在时必须是非空字符串（`""`/`null`/`false` 定义期即拒，绕过定义直调 `runStep` 运行期同样明确报「未注册适配器」而非静默走 HTTP 丢 body——`null` 与 `""`/`false` 同口径）；`matches` 自动认领不豁免校验：定义期可见全局注册表，运行期是引擎快照 + 实例适配器，两个集合可能不同，自动放行会产生「以为适配器处理、实际发 HTTP 静默丢 body」的假通过——适配器步骤须显式声明 `adapter` 字段。`body: null` / `fileUpload: null` 视为无体放行。模板路径分词与运行期统一为严格分词（`vars[]`、`vars[`、`vars.`、`vars..a`、`a..b`、`["a"]b`、未闭合引号等畸形写法定义期报「不是合法路径写法」，运行期解析为 `undefined` 而非根对象或错值；引号键仅 `\"`/`\'`/`\\` 参与反转义，其余 `\x` 序列按字面保留不改键名）；根写法补齐 `vars["key"]` / `lastResponse["key"]` / `lastResponseBody["key"]`——此前仅 `vars.` 点写法可解析，含运算符字符的键名经引号键写法才能取值。
- `matches` 断言的静态期望值定义期即编译校验：非法正则（如 `([`、`*bad`）此前在执行期被吞成断言失败，呈现为"值不匹配"而非"正则写错"；现 `defineScenario`/运行时校验即报错并给出正则与解析错误。含 `{{` 模板的期望值跳过（运行时解析后再判），`each` 子断言内的 `matches` 同口径校验。
- `retryUntil` 内的 `assertions` 字段定义期即拒绝（此前会被校验但从不在重试判定中执行——重试只用步骤顶层 `assertions`，误写者得到"一次即停"的静默错误行为）。报错信息指引把断言移到步骤的 `assertions`。

- `extract` 新增 `default` 兜底值（contract v6 → v7）：路径不存在时变量取声明的 `default`（支持模板、可引用先提取的变量），不再产生 warning；仅 `undefined` 判定缺失，JSON `null` 是真实响应值不触发兜底。`required: true` 与 `default` 互斥，同声明即报错。适配可选字段需要默认值的场景（如缺省分页参数、可选总数）。
- 数组路径下标支持负索引：`records[-1]` 取数组末项、`records[-N]` 取倒数第 N 项，extract、断言 path、模板 `{{vars.*}}`/`{{lastResponse.*}}` 与 `from: "headers"` 子路径同口径生效。此前 `[-1]` 能被分词却按字面属性名取值，静默得到 `undefined`（表现为提取 warning 或断言失败）。越界负索引按路径不存在处理；引号键（`a["-1"]`）与非数组上的 `a[-1]` 维持属性名语义不变。

### Migration Guide: v0.6.0 → v0.7.0

本版本把多处「静默失败」收紧为「定义期显式报错」，正常写法的场景不受影响：

1. **GET/HEAD 带 `request.body`/`request.fileUpload`**：body 原本被静默丢弃，现定义期报错——改用 `POST`/`PUT`/`PATCH` 或把参数放入 `params`。
2. **模板内表达式**（`{{vars.a > 0}}`/`{{!vars.x}}`/三元/函数调用等）：原本被当键名查找静默得空串，现定义期报错——改用 `when`/断言对象形式。
3. **`step.method` 模板写法**（`method: "{{vars.m}}"`）：原本按字面方法名发送，现定义期报错——动态方法写到 `request.method`。
4. **畸形路径**（`vars[]`、`vars..a`、`["a"]b` 等）：原本可能返回根对象或取错值，现定义期报「不是合法路径写法」。
5. **适配器步骤**：仅靠 `matches` 自动认领不再豁免 HTTP 校验——适配器步骤必须显式写 `adapter: "名字"`；`adapter: ""/null/false` 定义期即拒。
6. **`retryUntil` 内的 `assertions`**：原从不在重试判定中执行，现定义期报错——断言移到步骤顶层 `assertions`。
7. **CLI 输出变化**：失败步骤打印截断响应体（`SCENARIO_NO_BODY_PRINT=1` 可关闭）、retryUntil 轮询输出 `[RETRY]` 进度行——解析 CI 日志的工具会看到新行。

存量场景文件可用 `defineScenario`/`defineConfig` 定义期校验一次性列出全部违规点，报错信息均带迁移指引。

## [0.6.0] - 2026-10-11

### DSL

- 新增 `generatedVars` 类型 `enum`（contract v5 → v6）：从 `values` 候选集中按可选 `weights` 非负权重抽取一个值。权重缺省等权，权重为 0 的候选永不被选中，至少一项必须大于 0；候选值保留原始类型（数字/布尔/字符串原样）。抽取按 `runId` 与变量名确定性派生（`seedToUnit`/`pickWeightedIndex`，md5 前 12 位十六进制），同轮稳定可复现、跨轮变化、Node/浏览器双端一致。非法定义（values 非非空数组 / weights 形状或长度不符 / 含负数或非有限值 / 全零）在使用前报错。适配渠道、状态等枚举类参数需要"随机但可复现"取值的场景。

### 报告

- 修复浏览器 Markdown 报告行内正文的反引号：步骤名、失败原因、警告、断言名等经 `mdInline` 输出的值中，裸反引号会被 Markdown 当作行内代码定界符，奇数个时把后续文本整段吞进代码 span 破坏报告结构；现转义为字面量（`\``）。`mdCode` 生成的行内代码 span 与代码围栏行为不变，无反引号输入输出不变。

## [0.5.26] - 2026-10-10

### CLI

- `run` 失败断言输出有界：单行 `expected=... actual=...` 插值中的长值（序列化超 80 字符或不可序列化）替换为固定占位 `（长值，见下方）`，不再把完整值整行打印；结构化 diff 分块内每条内容行限宽 240 字符（不计缩进前缀），超出截断并追加 `…（本行已截断）` 标记。此前 20KB 级响应体会在单行插值与分块行中各完整输出一次，终端/AI 排错日志失去可读性。短值单行格式、20 行上限截断提示、字符串首个差异 40 字符窗口定位（仍按未截断原文计算）与 `each` 递归明细口径均不变；完整值仍可经 `runScenario` 断言结果获取。
- 修复 `--config -h` 把 `-h` 误当配置文件路径：取值型选项后遇 `-h` 按缺值报错（「错误：--config 缺少参数值」+ 可操作提示），单独 `-h` 与 `run -h` 仍正常输出帮助。`serve` 端口占用改为「错误 + 提示」两段式，提示行给出 `--port` 重试与 start-scenario-test.cmd 两条下一步路径。
- 修复 `doctor` 单点文件异常导致整份汇总（含 `--json`）丢失：运行时副本被同名目录/不可读路径占位时该检查 FAIL「运行时副本不可读取」并继续；版本锁内容非 JSON 对象（null/数组/字符串/数字）FAIL「版本锁必须是 JSON 对象」；锁内声明文件无法计算 SHA256 时逐项 FAIL「无法校验 SHA256」而非中断或静默跳过；`.scenario-test` 被同名文件占位时输出 `framework-directory` FAIL，node-version/config-load 等其余检查均继续执行。
- `init` 远程下载运行时副本增加每个文件 30 秒总超时（覆盖请求与完整读体）：响应头或响应体停滞不再让 init 长时间等待，超时按失败处理并提示「下载超时（30 秒）」，副本不完整时仍退出 1 且不写版本锁；本机 dist 拷贝与已存在跳过路径不变。
- 修复 `init` 升级刷新假成功：运行时副本下载/拷贝失败（返回 null）但磁盘上仍有旧文件时，旧逻辑照常重写版本锁为当前版本并提示「已初始化项目」。现改为收集全部失败文件后报错退出（「运行时副本更新失败」+ 重跑指引），不输出成功摘要、不改写旧版本锁、不删除旧副本；版本锁仅在副本齐备后写入。

### 报告

- 修复浏览器 Markdown 报告的代码 span：场景文件与请求路径含反引号时自适应定界符，保留 Windows 路径反斜杠；标题、环境、执行模式及明细中的 CR/LF 折叠为字面量，避免拆行。

## [0.5.25] - 2026-10-10

### 🎨 UI/UX 优化

- 部分操作按钮、场景卡片和侧栏 Tab 增加悬停及按下反馈；搜索输入框与键盘焦点补充视觉强调。
- 场景搜索、步骤筛选与报告空态增加虚线边框及柔和背景；修复场景列表通用卡片规则覆盖搜索空态边框的问题。
- 配置与临时请求弹窗增加入场过渡，背景模糊调整为 6px；滚动条整体宽度调整为 8px。
- 单步加载提示使用主题色旋转动画与透明度呼吸效果；两个动画分别控制旋转与透明度，避免相互覆盖。
- 尊重 `prefers-reduced-motion`：停用动画并取消新增交互位移，保留下拉箭头和居中控件所需的结构性变换。
- 报告进度条与状态徽章调整渐变和阴影，进度条宽度过渡调整为 0.35s。

### ✨ DSL / Engine

- 断言深比较对对象键序不敏感：`equals` / `notEquals` / `includes` / `oneOf`（含 `each` 子断言递归）由 `JSON.stringify` 直比改为按键名排序后的稳定序列化比较。此前 Java 服务端等键序不稳定的响应体会被误判不等（契约描述的「JSON 深比较相等」名不副实）。值语义保持严格：键名不同、值不同仍判不等；对象中值为 `undefined` 的键与 JSON 序列化口径一致（忽略，`{a:1}` ≡ `{a:1,b:undefined}`）。

### 🛠 CLI

- `run` 失败断言的长值降级为结构化 diff 分块：`expected`/`actual` 序列化超 80 字符时展开为可读分块——多行字符串按真实换行拆行（行号 1 基 + `|` 前缀，行内容 JSON 转义，CRLF/不可见字符以字面量透出，「看起来一样其实含 `\r`」的差异可见）、对象/数组两空格缩进展开、超 20 行截断；字符串值额外定位首个差异字符（1 基）并给前后 40 字符上下文窗口，差异字符 `«»` 高亮。短值保持既有单行 `expected=... actual=...` 口径不变；`each` 递归明细同口径。完整值仍可经编程接口 `runScenario` 返回的断言结果获取。
- `--help` 选项清单改为从 `contract.cli.options` 投射（含别名与取值占位，`--port <number>` 等），消除手写第二份名单；新增运行说明/初始化说明分节与 PowerShell 认证示例。
- CLI 报错统一为「错误 + 提示」两段式：缺配置文件、未知环境、缺 Base URL、缺变量、`--all`/`--scenario` 冲突、`--port` 越界、全部 manual 场景等使用错误，提示行直接给出下一步动作（如「使用 --config "<路径>" 指向已有配置」）。
- 未知参数按编辑距离给拼写建议（如 `--confg` → 「是否想使用 --config？」）；仅唯一近距候选才建议，等距二义或远距输入不猜，直接指引 `--help`。`--help`/`-h` 虽由 parseArgs 内联处理（不进 contract），也纳入建议名单。
- `--scenario` 未命中时列出可用场景候选（id — name 同列，`manual:true` 场景显式标注，超 12 项截断并计数），替代裸报错。
- `run` 结束新增中文结论行：区分执行失败 / 全部跳过（未发起请求）/ 执行未完成（stop 策略）/ 执行完成四态，并分开计数「实际失败」与「因 stop 策略未执行」的步骤——此前 Overall 分母口径（planned 含未执行）易被误读为「实际失败 N 步」。

### 🖥 浏览器工作台

- 修复 Markdown 诊断报告围栏被响应内容提前闭合：响应头/响应体含 ``` 等反引号序列（如响应体本身是 Markdown）时，代码围栏自动加长至「内容中最长反引号序列 + 1」（至少 3 个），报告结构不再破坏；内容原样保留，常规响应输出格式不变。
- 工作台快捷键在配置、临时请求弹窗和下拉菜单打开时暂停，避免编辑期间误执行场景或清除结果；忽略已处理事件及输入法组词事件。`Ctrl+K` / `⌘+K` 支持从其他输入框进入场景搜索，相关控件提示补充快捷键说明。
- 报告概览分开显示执行进度与通过率，进度百分比与进度条保持一致（如 3 步全部执行、2 步通过时分别显示 100.0% 与 66.7%）；进度条补充可访问的名称和数值。
- 场景搜索：输入后显示清除按钮，`Escape` 一键清空并回焦，无匹配时提供「清除搜索」空态入口。
- 步骤筛选：筛选按钮组补 `aria-pressed` 状态；新增「显示 x / y 个步骤」实时摘要与「清除筛选」一键恢复；搜索无匹配时列表区展示空态并可一键清除。
- 失败诊断新增「定位步骤」按钮：点击后重置筛选、展开对应步骤详情、高亮 2.4s 并平滑滚动居中（尊重 `prefers-reduced-motion`）——长场景失败排查不再需要在报告中人工比对步骤序号。
- 修复步骤筛选工具行窄容器溢出：390px 视口下「显示 x / y 个步骤」摘要遮挡「失败」筛选按钮致其不可点击（Playwright mobile 视口实测抓到）；`filterBar` 现允许换行、摘要可收缩截断。
- 主题切换（含编程赋值）同步自定义下拉标签文案；步骤行补 focus-visible 焦点环。
- `esc()` 转义统一补齐引号（`&quot;`）并移除浏览器端 `textContent→innerHTML` 分支，双端行为一致：属性上下文（如步骤搜索框 `value="${esc(kw)}"`）不再存在引号逃出属性边界的注入面，文本上下文显示不变。
- 全量执行循环取消语义对齐引擎 `runScenario`：取消信号中止时立即停止，不再多产生一条引擎不会记录的 CANCELLED 步骤（此前「本步已通过但信号已中止」会漏进下一轮）。

### 🔧 工程

- `.gitignore` 忽略 `npm run build` 中断残留的 `dist.staging-*` 原子交换暂存目录，避免污染 `git status`。
- 新增 `.gitattributes` 统一行尾策略（文本文件一律 LF 入库与检出、`.ps1` 保留 CRLF、图片按二进制），根治 R6 以来 Windows（`core.autocrlf=true`）下 `dist/` 投射物与生成文件反复出现的 CRLF 幻影改动（git status 标记 M 而 diff 为空）。

## [0.5.24] - 2026-10-07

### ✨ DSL / Engine

- 造数增强：`generatedVars` 的 `timestamp` 类型新增 `offset` / `unit` / `format` 三个可选参数，并新增 `uuid` 类型（`contractVersion` 4 → 5，保留全部旧字段）：
  - `offset`：相对当前时间的偏移（如 `{ name: "startTime", type: "timestamp", offset: "-7d" }`），数字 + 单位（`ms`/`s`/`m`/`h`/`d`/`w`，正负号可选、缺省为正；只提供固定跨度单位，不引入月/年等日历单位避免月末歧义）。时间窗查询（`startTime=now-7d`）、过期时间（`expiredAt=now+30d`）类参数此前只能写死时间戳或外部脚本拼值，现场景内自足表达且每次执行随当前时间移动。
  - `unit`：数值粒度 `ms`（默认，行为不变向后兼容）/ `s`（秒级，适配按秒传参的接口）。
  - `format`：本地时间格式化输出（token：`YYYY`/`MM`/`DD`/`HH`/`mm`/`ss`，如 `format: "YYYY-MM-DD HH:mm:ss"` 或 `"YYYY/MM/DD"`），输出字符串，与 `unit` 互斥；残缺 token 片段（如 `"Y-M-D"`）或不含任何 token 的 format 直接报错，不静默输出字面量。
  - `uuid`：标准带连字符 UUID v4（`{ name: "orderId", type: "uuid" }`），适配以 UUID 为业务主键的接口；既有 `uuidHex` 保持 32 位无连字符形态不变。模板层无字符串变换能力，此前带连字符形态无法在 DSL 内生成。
  - 浏览器工作台运行时同口径镜像（工作台与 CLI 继续可跑同一套场景）；init 生成的 AI 提示词与场景模式补对应造数指引；d.ts `GeneratedVarDefinition` 补 `offset`/`unit`/`format` 属性。
- CLI `run` 失败输出补 `each` 元素级明细行：失败断言行下方逐行列出失败元素（1 基序号）与失败子断言的期望/实际值，嵌套 `each` 递归展开、路径「 › 」串联（如「第 1 项 › 第 2 项」）——此前明细只在 JSON 报告里，终端排查需翻 JSON 才能定位「第几项、哪个子断言错」。值经 `JSON.stringify` 输出，含换行的响应值转义为字面量不拆行。
- 工作台断言表与「复制诊断报告 (Markdown)」对嵌套 `each` 失败明细**递归展开**：此前引擎数据已递归携带各层 `detail`，但两处展示只展开一层，两层以上嵌套（如「列表 › 明细 › 字段」逐项校验）只能看到外层失败。现多层失败路径逐行列出（Markdown 侧缩进逐层加深），通过的子断言不产生行；扁平场景输出格式不变。
- 修复 Markdown 诊断报告值拼接排版破坏：失败明细/失败原因/警告中的响应值现经转义拼接（反斜杠先行转义、换行折叠为字面量 `\n`，非字符串值用紧凑 JSON 单行）——含换行或 `- ` 等列表标记的响应值此前会把列表项拆行、伪造嵌套列表，报告喂给 AI 排查时结构失真。
- 修复 `from: "headers"` 配 `path` 取响应头大小写敏感的问题：头名现按大小写不敏感匹配（HTTP 头名本就不区分大小写），如 `{ from: "headers", path: "x-total", equals: "42" }` 可命中实际头键 `X-Total`，提取 `{ name: "t", from: "headers", path: "X-Total" }` 同理。此前该写法走精确键匹配，而 HTTP/2 响应头一律小写，`path` 按惯例大小写书写时取不到值（`header` 简写与 `extract.header` 经 `headerValue` 早已忽略大小写，属两套口径不一致的真缺陷）。**行为变更而非新增能力**，`contractVersion` 维持 4：若既有场景依赖「大小写不一致的头名取不到值」这一缺陷行为（如对换大小写头名断言 `exists: false`），结果可能翻转，请核对。`path` 首段后的子路径（在头值上取子路径）与通用路径导航（`from: "response"`、模板 `lastResponse.headers.*`）仍保持精确匹配。
- `each` 断言失败时透出元素级明细：断言结果新增可选 `detail` 字段（`AssertionResult` 既有四字段不变，旧消费方不受影响），列出每个失败元素的下标（0 基）、元素值与该元素上全部子断言的期望/实际值——此前 `each` 失败只显示整个数组 vs 子断言，无从得知第几项、哪个子断言错；嵌套 `each` 的子结果递归携带各自的 `detail`。明细随步骤断言结果流入场景报告 JSON（CLI `run` / 工作台导出）。
- 工作台断言表格：`each` 失败行下方逐行列出失败元素（「↳ 第 N 项」）与失败子断言的期望/实际值；Markdown 报告导出同步透出「第 N 项失败: 期望 X，实得 Y」。
- 断言新增 `each` 操作符：数组元素逐项断言（如 `{ path: "data.list", each: { path: "code", equals: 0 } }`；或传子断言数组要求每项同时满足多条）。此前「列表每一项的 code 都是 0」只能 `matches` 正则 hack 或按索引拆成 N 条断言。子断言 `path` 相对每个元素自身，期望值支持 `{{vars.*}}` 模板变量；任一元素任一子断言失败则整体失败；空数组恒通过；非数组实际值直接失败不抛异常。定义期即校验子断言形状（缺操作符/未知键 fail-fast 定位到场景/步骤/断言序号）。
- 契约 `contractVersion` 3 → 4（新增能力，保留旧字段）：capabilities JSON、`scenario-test.d.ts`、AI 提示词与场景模式文档同步投影新操作符（d.ts 中 `each` 投射为 `Assertion | Assertion[]` 自引用类型）。
- 断言新增 `startsWith` / `endsWith` 操作符：前缀/后缀精确断言（如 `{ path: "data.token", startsWith: "Bearer " }`、`{ header: "Content-Disposition", endsWith: ".pdf" }`）。此前前缀/后缀只能用 `matches` 写正则，转义负担大且可读性差。大小写敏感；非字符串实际值先字符串化再比较，null/undefined 实际值视为空串（与 `includes` 字符串分支口径一致）；期望值支持 `{{vars.*}}` 模板变量。
- 契约 `contractVersion` 2 → 3（新增能力，保留旧字段）：capabilities JSON、`scenario-test.d.ts`、AI 提示词与场景模式文档同步投影新操作符。
- 修复 d.ts 投射缺漏：`Assertion`/`WhenDefinition` 接口属性现由 contract 操作符表自动投影（此前手写，新增 `startsWith`/`endsWith` 时漏更导致 TS2353）；`generate-dts.mjs` 不再维护第二份操作符名单，新增测试锁定接口属性与 contract 全量一致。

## [0.5.23] - 2026-10-05

### ✨ DSL / Engine

- 断言新增 `length` 操作符：数组元素个数 / 字符串字符数 / 对象键数精确比较（如 `{ path: "data.list", length: 10 }`）；非容器类型（number/boolean/null）直接失败不抛异常，断言结果中的 actual 回写为可读长度。此前列表条数只能靠 `matches` 正则 hack。
- 断言新增 `target: "duration"` 耗时目标：`{ target: "duration", lte: 800 }` 断言单次请求耗时（毫秒），可与 gte/gt/lte/lt 组合做耗时区间/SLA 检查；引擎在每次尝试后挂载 `response.durationMs`（适配器自带计时不覆盖），并随 `result.response` 透出到报告与工作台。
- `generatedVars` 新增 `idcard` 类型：生成中国大陆 18 位居民身份证号（测试造数）。参数 `birthDate`（必填，YYYY-MM-DD 合法日历日期）、`gender`（MALE/FEMALE，默认 MALE，约束顺序码第 17 位奇偶）、`regionCode`（6 位行政区划，缺省从真实测试区划池按轮次派生）。
- `generatedVars` 新增 `luhn` / `phone` / `uscc` 类型（测试造数）：`luhn` 银行卡号（`length` 12-19 默认 16、`prefix` 数字卡头默认 "62"，末位 Luhn 校验）；`phone` 大陆手机号（`prefix` 3 位号段，缺省从测试号段池派生）；`uscc` 统一社会信用代码（`regionCode` 默认 110100，登记管理/机构类别固定 91 企业法人，校验位按 GB 32100-2015）。
- 顺序码由 `runId` 与变量名确定性派生：跨轮唯一、轮内不同名变量互异，校验位按 GB 11643-1999 计算；解决"带校验位约束且库内唯一"的字段无法在声明式场景中动态造数、固定值重跑撞唯一性的问题。
- core 新增通用校验位底座 `gb11643Checksum` / `buildChinaIdNumber` / `seedToIndex`（纯函数，浏览器/Node 双端一致），以及 `luhnCheckDigit` / `usccCheckChar` / `buildUsccCode`。
- 契约 `contractVersion` 1 → 2（新增能力，保留旧字段）；新增 `assertions.targets`（status/duration）能力声明；`dist/scenario-test.d.ts` 的 `GeneratedVarDefinition` 补充造数参数字段、`Assertion`/`WhenDefinition` 补充 `length` 与 `target: "duration"`；AI 提示词与场景模式规则补充造数类型使用指引（禁止写死固定/真实号码）及 length/duration 断言用法。

### ⚡ 性能 / 工程

- 浏览器工作台步骤快照（`snapshotStepRuntime`）由 JSON 深拷贝改为浅拷贝 + 响应引用共享：大响应多步骤场景不再每步深拷贝两份响应体，单步回退/重跑语义不变。
- npm tarball 精确列出 dist 产物，不再携带 ~2.6MB 的 sourcemap（`files` 由 `dist` 目录改为逐文件）。
- 新增 `test:coverage`（Node 内置覆盖率）与 `check:all`（build + test + 浏览器测试）脚本；Node 侧核心模块补齐适配器协议、Node IO、CLI 主路径等测试盲区（129 → 160+ 用例）。
- 构建原子化：`npm run build` 产物先写入 staging 目录、全部成功后 rename 交换 `dist/`（生成文件一律临时文件 + rename 原子写）。修复 dev 监听重建与 `npm run check` 并发时 dist 处于半成品状态，导致 init/doctor/CLI 类测试偶发失败的问题；构建失败时旧 `dist/` 现在保持完整。

### 🎨 工作台体验 / 开发预览

- 工作台步骤详情新增「运行时变量」折叠面板：展示该步骤执行后的变量全量（配置/场景/造数/提取/保留变量），并用绿色「本步变更」徽标高亮该步骤 `extract` 写入的键——断链调试时可直接看到每步 `{{vars.*}}` 的实际解析结果与写入侧效果；单步回退/重跑/清除结果后面板随快照同步。
- `npm run dev` 开箱即用：自动拉起本地 Mock 服务并按 `serve` 同款同源代理转发示例请求（HTML 注入 `__SCENARIO_TEST_SERVE_PROXY__`，免 CORS）；Mock 端口从 4310 起自动避让本机占用（可用 `MOCK_PORT` 指定），修复示例环境被本机其它程序（如 QQ）占用 4310 时 basic/complete 示例必坏的问题。
- Mock 服务补 `GET /slow`（3s 延迟响应，覆盖 basic 的取消/超时场景），端口支持 `MOCK_PORT` 环境变量。
- 未执行状态去噪：统计面板不再渲染全零指标网格，改为「总步骤进度 + 尚未执行引导」空态；底部「总耗时」未执行时为中性色，有结果后才转绿色。
- 「失败诊断」Tab 徽标仅在存在失败（>0 或执行前异常 `!`）时显示，未执行/全通过时不再出现无意义的「0」。
- 修复底部执行栏「开始时间/结束时间」永远显示「-」的死 UI：会话开始/结束（跑完、取消、异常、回退）现在正确落值，「清除结果」后归位。

## [0.5.22] - 2026-09-11

### ✨ Browser Workbench

- 侧边栏升级为双 Tab 模式（「执行摘要」与「失败诊断」联动），支持失败数量告警角标（Badge）。
- 失败链路闭环：执行失败或中断时自动激活「失败诊断」面板，并在诊断面板底部增加「复制诊断报告 (AI 排查)」与「导出结果 JSON」快捷操作。
- 修复前置配置缺失与执行异常时错误信息被隐藏的问题，自动解锁并展示诊断面板告警卡片。
- 统一运行中「已取消（cancelled）」状态的统计口径，避免被误计入失败导致进度条与状态看板冲突。
- 优化用例步骤操作按钮（复制/cURL/调试）的视觉交互与可交互性，提升桌面分屏窄窗口下的可用性。

### 🛠️ Maintenance & Tests

- 修复 Playwright 浏览器自动化回归测试。
- 清理冗余样式规则，提升侧边栏切换与隐藏选择器优先级。

## [0.5.21] - 2026-08-20

### ✨ Browser Workbench

- 升级为现代 3 栏工作台架构：左侧场景列表、中栏步骤与报文流水线、右侧执行统计与进度看板。
- 新增分段胶囊进度条（Segmented Step Progress Bar），精准呈现步骤执行进度与完成比例。
- 步骤详情全面支持左右双栏对照（请求 Request vs 响应 Response）、暗色代码编辑器风格报文查看（带独立行号 Gutter）与断言明细表格。
- 支持一键 `复制为 Markdown` 报告（可直接投喂给 AI 提问/排查）与 `导出 JSON` 结果。
- 底部常驻展示场景执行时间统计（开始时间、结束时间、总耗时）。
- 修复步骤详情高度溢出与双重滚动条问题，全面优化多分辨率弹性适配。

### ✅ Tests

- 更新 Playwright 浏览器自动化测试以适配最新 3 栏工作台与分段进度条。

## [0.5.20] - 2026-08-19

### ✨ Browser Workbench

- 重构工作台视觉层级与响应式布局，补充键盘操作、焦点管理、运行状态反馈和可访问性语义。
- 优化步骤筛选、请求与响应复制、cURL 生成及临时请求调试，支持场景变量和全局 header、cookie、query 参数。
- 压缩 AI 测试报告占用空间：概览指标合并、失败诊断按需展开，并支持整体报告收起与恢复。
- 新增 `failurePolicy: "continue"` 示例场景，便于验证失败后继续执行。

### ✅ Tests

- 浏览器测试同步覆盖 5 个示例场景、报告收起/展开以及失败诊断默认展开行为。

## [0.5.19] - 2026-08-18

> 本版由整体代码审查驱动（4 个专项审查 + 2 轮修复后独立评审），共修复 1 项 HIGH、10 项 MEDIUM 与若干 LOW。
> **行为变更**（升级注意）：doctor 对 SHA256 失配（运行时文件被替换）由 WARN 提级为 FAIL（退出码 1）；serve 对伪造 Host 头返回 403；`--allow-external-plugins` 的相对路径基准由进程 CWD 改为配置目录；场景最后一步执行中被取消时整体状态由 FAILED 修正为 CANCELLED；`retryUntil.maxElapsedMs` 超限的步骤状态由 ERROR 修正为 TIMEOUT；`start-scenario-test.ps1` 默认端口由固定 4300 改为随机空闲端口（未显式 `-Port` 时）；凭据类场景变量输入框默认掩码显示。

### 🐛 Bug Fixes

1. **入口脚本**
   - `start-scenario-test.ps1` 优先调用项目内免 npm 运行时副本（`npx --no-install` 降级为回退路径），未显式 `-Port` 时向系统申请随机空闲端口（与 `.cmd` 一致）。
   - `install.ps1` 兼容 Windows PowerShell 5.1：捕获原生命令输出期间临时降低 `ErrorActionPreference`，node/npm 输出 stderr 不再中断安装；路径参数统一加引号（含空格路径可用）。
   - `install.sh` 安装提示的执行命令补上 `run` 子命令。
   - `dev.mjs` 修复构建产物自触发无限重建（watch 排除 build 写回 `src` 的两个生成文件）。
2. **serve 安全与正确性**
   - 未知 `--env` 报错退出（不再静默回退 `envs[0]` 可能代理到生产），启动日志打印实际生效的环境 key。
   - Host 头白名单校验：仅放行本机回环域名，伪造 Host（DNS rebinding）返回 403。
   - 代理双向剔除 `Connection` 头点名的自定义字段（RFC 7230 §6.1）。
   - `--base-url` 对 serve 生效（临时覆盖代理目标，日志标注覆盖来源）。
3. **浏览器工作台**
   - `?scenario=` 必须命中配置场景清单，未清单文件拒绝加载（注册校验原本发生在脚本执行之后，防诱导链接执行工作区内任意 JS）。
   - 整体报告 CANCELLED 语义与 engine 对齐（含最后一步取消的边界）；取消步骤不再列入"失败步骤"区。
   - 长场景：执行期增量渲染（不再每步全量重建），大响应体展示超 64K 截断（复制 MD/JSON 保留完整内容）。
   - 凭据类场景变量（token/secret/password 等命名）输入框掩码显示并提供明文切换。
   - 步骤列表 method/status 渲染统一转义。
4. **执行引擎**
   - `delay()` 增加预中止检查，取消不再白等 `intervalMs`。
   - 响应体按 `content-type` 的 charset 解码（GBK 等中文响应不再乱码），非法标签回退 UTF-8。
   - 重试总时长（`retryUntil.maxElapsedMs`）超限状态由 ERROR 修正为 TIMEOUT，保留"重试超时"诊断消息。
5. **doctor 完整性**
   - SHA256 失配（运行时文件被替换）提级 FAIL（退出码 1）；版本锁缺 `sha256` 显式 WARN；失配判定限定锁声明文件（与 init 自愈刷新范围对齐）。
6. **其他**
   - `--allow-external-plugins` 相对路径以配置目录为基准解析（与未加 flag 时一致）。
   - `ScenarioStepResult` 类型补声明 `cancelled`/`timedOut` 字段。

### 🔧 Refactor

- `src/browser/legacy` 更名 `src/browser/ui`（git mv 保历史）：该目录是唯一且活跃的工作台实现，原名误导；`createLegacyRuntime` 更名 `createWorkbenchRuntime`，相关引用同步。

### 📚 Docs

- `loader.js` 与 SECURITY.md 明确信任前提：vm 仅上下文隔离、非安全边界，配置即代码、只加载可信来源。
- SECURITY.md 新增 serve 本地暴露面章节（回环绑定与 Host 校验边界、同机进程可读工作区、勿放生产凭据）。

### ✅ Tests

- 新增回归：Host 白名单、未知环境（含看门狗）、Connection 点名字段双向、`--base-url` 覆盖、GBK 解码、重试前取消、末步取消、重试超时、doctor 锁缺失/篡改、`?scenario=` 未清单拒绝、大响应体截断边界、d.ts 形状漂移防线（Engine/ScenarioApp/Step/报告形状双向一致）。
- `waitForOutput` 改累积缓冲消除 chunk 竞态，并加 settle 守卫与监听器清理。

## [0.5.18] - 2026-08-17

### 🐛 Bug Fixes

1. **浏览器产物调用 `runScenario`/`createRuntime` 崩溃修复**
   - `buildGeneratedVars` 曾无条件读取 `process.env.SCENARIO_VERBOSE_ERRORS`，浏览器（UMD/ESM）无 `process` 全局，直接调用公共 API 即抛 `ReferenceError`。
   - 修复为 `typeof process !== "undefined"` 守卫后读取，Node 行为不变。
2. **serve 代理协议处理加固（不再因配置错误崩溃）**
   - https 上游此前用 `http.request` 转发，同步抛 `ERR_INVALID_PROTOCOL` 逃逸为 uncaughtException，整个 serve 进程退出；现按协议选择 `http`/`https` 模块，https 上游可正常转发。
   - 无协议 / 非法 baseUrl（如 `192.168.1.5:8080`）同步抛 `ERR_INVALID_URL` 导致进程崩溃；现降级为 502 并提示 baseUrl 需带协议前缀。
   - https 上游支持自签证书（`rejectUnauthorized: false`，与 vite/webpack-dev-server 的 `secure: false` 同语义），适配内网 https 联调。
3. **`retryUntil.maxAttempts` 语义对齐字段名**
   - 历史实现为 `maxAttempts + 1`（重试次数语义），与字段名"最大尝试次数"矛盾；现 `maxAttempts` 即最大尝试总次数（含首次请求），默认 10。
4. **场景报告新增 `CANCELLED` 状态**
   - 取消恰好落在两步之间时，报告此前返回 `status: "PASSED"` 且 `passed: false` 的自相矛盾组合；现中止且未执行到位的场景状态为 `CANCELLED`。

### ✅ Tests

- 补浏览器环境（无 `process` 全局）回归：`runScenario` 正常执行、缺 envVars 错误消息不泄漏环境变量名。
- 补 serve 代理回归：https 上游连接失败 502 且进程存活、无协议 baseUrl 502 且进程存活、https 端到端转发（openssl 自签证书，无 openssl 自动跳过）。
- 补 `maxAttempts` 精确计数与取消时序 `CANCELLED` 状态回归。

## [0.5.17] - 2026-08-14

### 📚 Docs

1. **升级章节充实**
   - 补升级原理说明：版本锁自动检测、默认保留 config 与 scenarios、`--force` 覆盖警示。
   - 按免 npm / npm / 内网三种接入方式给出可复制的升级命令。
   - 补接入方式判断（`.scenario-test/` 目录 vs package.json 依赖）与 doctor 体检判定标准。
   - 「安装完成后」小节加升级章节交叉引用，已接入项目可直达。

## [0.5.16] - 2026-08-14

### 🐛 Bug Fixes

1. **取消/超时诊断语义收敛**
   - 取消兜底文案统一收口到 `abortReason()`，消除 delay / createRequestSignal / readBodyChunks / runStep 四处重复。
   - 超时消息由 `timeoutMs` 在消费点派生，移除 `scenarioContext.timeoutMessage` 冗余传递通道。
2. **浏览器工作台签名密钥校验对齐**
   - 签名生成缺少密钥变量时与 Node 引擎一致直接报错，不再静默用 `undefined` 生成错误签名继续执行。

### ✅ Tests

- 补单步模式超时回归测试：TIMEOUT 后 stepRuntime 清空，再次执行从第 1 步重来。

## [0.5.15] - 2026-08-14

### 🐛 Bug Fixes

1. **读体阶段纳入超时控制**
   - 响应体读取（text / arrayBuffer）显式接入请求 signal，不再依赖 fetch 实现的 abort 传播语义。
   - 服务器返回响应头后 body 挂起时，同样受 `timeoutMs` / 取消控制，步骤判为 TIMEOUT 而非永久挂起。
2. **serve 代理响应方向剔除 hop-by-hop 头**
   - 响应方向与请求方向对称，`transfer-encoding` / `upgrade` / `Proxy-Authenticate` 等不再透传给浏览器。
3. **重试保护参数定义期校验**
   - `retryUntil.maxElapsedMs` 拒绝负数 / 0 / 非数值，避免字符串使 5 分钟重试保护静默失效。
4. **`request.timeoutMs` 支持模板变量**
   - 超时计算纳入变量解析后的 `request.timeoutMs`，`{{vars.xxx}}` 写法恢复生效。

### ✅ Tests

- 补读体挂起 → TIMEOUT、serve 响应方向 hop-by-hop 剔除、非法 retryUntil 数值等用例。

## [0.5.14] - 2026-08-14

### 🐛 Bug Fixes

1. **失败诊断语义回补**
   - 失败步骤恢复展示注入后的最终请求头（Authorization / 全局 header / 合并 cookie / query），调试 401 等鉴权失败不再丢失关键信息。
   - 手动取消恢复中文提示「用户已取消执行」，失败 method 徽章恢复解析后的方法（如 GET），不再显示 ERROR。
2. **超时与取消判定结构化**
   - 超时识别从正则匹配错误文案改为结构化标记，不再依赖 Chrome abort reason 传播。
   - 非法 timeoutMs（负值 / Infinity / 字符串 "0"）恢复默认 30000ms 钳制，避免永不超时。
3. **serve 同源代理硬化**
   - 按 RFC 7230 §6.1 剔除完整 hop-by-hop 头，防止 transfer-encoding / upgrade 泄漏到上游。

### ♻️ Refactor

- **浏览器工作台执行层收敛到 Node 引擎**：删除 511 行双端同构的 legacy/core.js，executeStep 统一调用 engine.runStep，断言 / 提取 / 变量解析收敛为 src/core.js 单一实现。

### ✅ Tests

- 恢复 includes / oneOf / exists 操作符的 passed 值级断言（含数组深比较、oneOf 非数组等假绿回归）。
- 浏览器 E2E 补取消文案、注入头回填、TIMEOUT 徽章断言。

## [0.5.13] - 2026-08-13

### 🐛 Bug Fixes

1. **工作台复制能力补全**
   - 待执行、已执行和跳过步骤统一提供复制按钮，可复制步骤标题、请求方法与接口路径。
   - 报告 Markdown、JSON 与步骤复制统一展示成功或失败反馈，并在短暂提示后恢复按钮文案。
2. **剪贴板异常与兼容性修复**
   - Clipboard API 同步抛错或异步拒绝时可靠回退到 `execCommand`，回退失败不再产生未处理 Promise rejection。
   - 无 DOM 环境安全返回失败；回退流程始终清理临时元素并恢复此前焦点。
3. **复制回归测试补充**
   - 覆盖待执行/跳过步骤、同步异常、异步拒绝、失败反馈、文案恢复及无 DOM 环境。

## [0.5.12] - 2026-08-12

### 🐛 Bug Fixes

1. **接入 Prompt 精简**
   - 安装接入 Prompt 由 8 条精简为 6 条：删除已被机制兜底的防御条款（命令格式由 CLI 守卫纠错、固定版本 URL 由 doctor 校验），只保留核心流程（安装 → doctor 体检 → 读取项目内规则 → 询问业务功能）。

## [0.5.11] - 2026-08-12

### 🐛 Bug Fixes

1. **CLI 命令位置纠错**
   - 命令（run/serve/doctor/init/capabilities）出现在参数位置时，明确报错并给出正确写法，不再静默当成 run 的场景名报「未找到场景」。
2. **文档与实现一致化**
   - 安装接入 Prompt 统一收口到根目录 README「快速接入」（删除 docs/AI_INSTALL_PROMPT.md，消除两份 Prompt 分叉）。
   - README 执行场景示例补 `run` 命令（命令统一紧跟脚本名）；`--library-url` 文件清单补全 AI 规则两个文件；目录树标注 init 生成与 AI 维护的边界。
   - init 生成的项目内 README 同步补 `run` 命令。

## [0.5.10] - 2026-08-12

### 🐛 Bug Fixes

1. **init --no-input：脚本安装不再卡死**
   - `init` 新增 `--no-input`，目标目录已存在时按 keep（保留配置与场景，仅刷新 AI 规则和运行时副本），不进入交互确认。
   - `install.ps1` / 安装流程对 init 传 `--no-input` 并实时回显输出，修复"目标目录已存在时 init 的交互提示被捕获输出吞掉、用户看不到任何提示而静默卡住"的问题。
2. **运行时副本刷新兜底**
   - `init` 在版本锁 sha256 与磁盘实际不符（副本被篡改/损坏/手工替换）时也刷新运行时副本，保证副本可信。

## [0.5.9] - 2026-08-12

### 🐛 Bug Fixes

1. **serve 自动强制浏览器使用同源代理**
   - `serve` 返回 HTML 时注入代理模式标记；浏览器继续展示和维护环境 `baseUrl`，仅在实际发送请求时改用当前工作台同源地址，再由服务端转发到所选环境，修复页面直连后端导致 CORS 的问题。
2. **工作台启动脚本使用随机空闲端口**
   - 生成的 `start-scenario-test.cmd` 不再固定占用 4300，改为向系统申请随机空闲端口，浏览器 URL 与 `--port` 使用同一端口，支持多项目同时启动互不冲突。
3. **端口被占用时友好提示**
   - `serve` 捕获 `EADDRINUSE`，输出「端口已被占用，请重新启动以获取新的随机端口」并退出码 1，不再输出未处理异常堆栈。
4. **免 npm 接入提示与文档对齐**
   - `init` 提示语、项目内 README 与安装脚本统一为「serve 自动启用同源接口代理」，不再要求手工清空页面 baseUrl。

## [0.5.8] - 2026-03-15

### ✨ Integration Experience

1. **快速接入 Prompt 直接给固定脚本地址，禁止 AI 搜索安装地址**
   - README 快速接入与 AI 接入 Prompt 补全固定版本脚本 URL（Windows `install.ps1`、macOS/Linux `install.sh`），并明确禁止 AI 搜索安装地址、GitHub Release 或 npm 最新版本，安装脚本与示例 URL 同步固定为 `v0.5.8`。

## [0.5.7] - 2026-03-15

### 🐛 Bug Fixes

1. **免 npm 下载不再依赖 GitHub API或 Node fetch**
   - 默认从 npm Registry 下载一次固定版本 tarball，在临时目录解压后由本地 `dist/` 初始化，避免 GitHub API共享出口限流以及 Node `fetch` 不继承系统代理的问题。
   - `Source` / `SCENARIO_TEST_SOURCE` 仍可指定内网 GitLab Raw 或制品目录；安装脚本会自行下载并校验全部 4 个运行时文件。

## [0.5.6] - 2026-03-15

### ✨ Integration Experience

1. **默认免 npm 接入，npm 降为显式可选**
   - 官方 `install.ps1` / `install.sh` 反转默认：无开关时直接从固定版本 GitHub Tag 的 `dist/` Raw 目录下载 CLI 并执行 `init --library-url`，业务项目不执行 `npm install`、不改 `package.json` / `package-lock.json`；`Source` / `SCENARIO_TEST_SOURCE` 可覆盖为内网 GitLab Raw 或制品目录（默认固定 `v0.5.6/dist/`）。
   - npm 变为显式可选：PowerShell `-UseNpm`、shell `SCENARIO_TEST_USE_NPM=true`，只有显式开启才执行 npm 安装；失败即退出，不静默切换。AI 接入 Prompt 默认指示免 npm，仅当用户明确要求 npm 时才切换；两种方式不混用、不自动兜底。
   - `init` 在无本机 dist/npm 包时，从 `--library-url` 指定目录下载全部 4 个运行时文件（CLI/UMD/d.ts/能力清单）；运行时副本任一缺失时明确失败（退出码 1）且不写版本锁，不再出现下载失败仍假成功的不完整安装。
   - 安装脚本生成文件校验覆盖全部运行时副本（CLI/UMD/d.ts/能力清单/版本锁），不再只检查 AI 规则文件。
   - `scenario.config.js` 三斜线引用改为项目内相对路径（`/// <reference path="./.scenario-test/scenario-test.d.ts" />`），免 npm 项目无 npm 包时类型提示仍可用；项目内生成的 README 以 `start-scenario-test.cmd` 与 `.scenario-test/scenario-test-cli.cjs` 为主命令，不再把 npx 写成默认。

## [0.5.5] - 2026-03-15

### ✨ Integration Experience

1. **运行时副本随 init 落盘，离线双击可用**
   - `init` 把 CLI、UMD、d.ts、能力清单复制到项目 `.scenario-test/`，写入 `.scenario-test-version.json`（版本 + SHA256 版本锁）；副本优先从本机 npm 包 `dist/` 拷贝，`--library-url` 可指定远程下载地址（默认 GitHub Release）。
   - `index.html` 改为引用 `./.scenario-test/scenario-test.umd.js`；`start-scenario-test.cmd` 使用副本 CLI 启动工作台，不依赖 npx 与网络。
   - `doctor` 恢复运行时握手：UMD/d.ts 版本一致、能力清单 schema/版本、版本锁文件存在性与 SHA256 指纹。

2. **serve 新增同源接口代理，绕开浏览器 CORS**
   - `serve` 对非静态请求按当前环境 `baseUrl` 服务端转发（页面 `baseUrl` 留空即走代理），后端无需放行 CORS；静态文件优先，代理目标不可达返回 502。
   - 启动日志打印代理目标：`接口代理: <envKey> -> <baseUrl>`。

## [0.5.4] - 2026-03-14

### ✨ Distribution

1. **Windows HTTP Server 启动脚本随发行版提供**
   - 新增 `scripts/start-scenario-test.ps1`，支持 `-Project`、`-Config`、`-Port` 与可选 `-OpenBrowser`；默认读取 `scenario-test/scenario.config.js`。
   - npm 包通过 `files` 包含该脚本；GitLab Release 新增同名下载资产，并按其仓库 `scripts/` 路径生成链接。

### ⚠️ Breaking Changes

1. **运行时统一由 npm 包提供**
   - CLI、浏览器 UMD、d.ts 和能力清单不再复制到业务项目的 `.scenario-test/`；运行时唯一来源改为 `node_modules/@yc_yzkj/scenario-test/dist/`。
   - init 生成的 `index.html` 直接引用 `../node_modules/@yc_yzkj/scenario-test/dist/scenario-test.umd.js`，`serve` 新增对应路由并从 CLI 所在 npm 包的 `dist/` 提供文件。
   - 业务项目必须先执行 `npm install -D @yc_yzkj/scenario-test`，不再支持下载单文件 CLI 兜底或克隆即用。

2. **移除项目版本锁与旧平铺布局兼容**
   - 删除 `.scenario-test-version.json`、运行时 SHA256/版本握手以及 `--library-url`；npm 包版本天然保证 CLI、UMD 与 d.ts 一致。
   - `.scenario-test/` 仅保存 `AI_SCENARIO_PROMPT.md` 和 `SCENARIO_PATTERNS.md`；doctor 改为检查配置、场景、DSL 与 AI 规则就绪。
   - init 与 doctor 统一使用 `.scenario-test/` 布局，不再探测或维护旧版平铺框架文件。

### ✨ Integration Experience

1. **npm-only 一键安装与运行命令**
   - `scripts/install.sh` / `scripts/install.ps1` 改为执行 `npm install -D @yc_yzkj/scenario-test`、`npx ... init` 和 `npx ... doctor`，不再下载 Release CLI。
   - README、AI 接入 Prompt、项目初始化模板与内部指南统一使用 `npx @yc_yzkj/scenario-test`。
   - 项目 `scenario.config.js` 通过 `/// <reference types="@yc_yzkj/scenario-test" />` 使用 npm 包内类型声明。

### Migration Guide

1. 在业务项目根目录执行 `npm install -D @yc_yzkj/scenario-test`。
2. 执行 `npx @yc_yzkj/scenario-test init --project . --dir "scenario-test"`，刷新 `.scenario-test/` 中的 AI 规则。
3. 执行 `npx @yc_yzkj/scenario-test doctor --config scenario-test/scenario.config.js`。
4. 可手动删除旧 `.scenario-test/` 中的 `scenario-test-cli.cjs`、`scenario-test.umd.js`、`scenario-test.d.ts`、`scenario-test-capabilities.json` 和 `.scenario-test-version.json`；不要删除 AI 规则、配置或场景文件。

### ✨ Integration Experience

1. **一键安装脚本成为 README 主路径**
   - `scripts/install.sh` / `scripts/install.ps1` 首次纳入版本管理并对外指引：README「给业务同事」章节新增「方式一：一键安装脚本（推荐，最快）」，Windows 用 `irm ... install.ps1 | iex`、macOS/Linux 用 `curl ... install.sh | bash`，脚本自动完成 Node 检查、下载固定版本 CLI、`init` 与 `doctor` 体检并打印使用引导。
   - AI 接入 Prompt 精简为「脚本优先 + 手动兜底」：AI 优先运行官方安装脚本；脚本不可用（如内网受限）时自主下载 CLI 完成 `init` 和 `doctor`。`docs/AI_INSTALL_PROMPT.md` 与 README 内联 Prompt 同步更新。
   - `tests/contract.test.js` 新增一键脚本默认版本断言，锁住 `install.sh` / `install.ps1` 的默认版本与 `package.json` 一致，防升级时静默漂移。

2. **npm 发布：`@yc_yzkj/scenario-test`**
   - `package.json` 改为 scoped 包名 `@yc_yzkj/scenario-test`，去除 `private`，新增 `files: ["dist"]`、`bin: { "scenario-test": "dist/scenario-test-cli.cjs" }` 与 `license`。
   - CLI 产物增加 shebang（`#!/usr/bin/env node`），支持 `npx @yc_yzkj/scenario-test` 直接执行。
   - README、`docs/AI_INSTALL_PROMPT.md`、`examples/EXAMPLES_INDEX.md` 改为以 npm 安装为主路径（`npm install -D @yc_yzkj/scenario-test` + `npx @yc_yzkj/scenario-test init`），GitHub Release 下载降为 npm 不可用时的兜底。
   - `tests/contract.test.js` quick-start 断言允许 `npm install`（仍禁止 `git clone` / `npm run build`）。
   - `docs/RELEASING.md` 补充 `npm publish --access public` 发布步骤。

3. **init 目标目录已存在时交互确认**
   - 目标目录已存在且未传 `--force` 时，`init` 交互询问：`o` 覆盖已有文件（等价 `--force`）、`k` 保留现有文件（默认：刷新 `.scenario-test/` 内 AI 规则，不覆盖项目配置与场景）、`c` 取消。
   - stdin 非 TTY（CI、安装脚本、管道）时自动采用默认保留，不阻塞自动化流程。
   - README 与 `docs/AI_INSTALL_PROMPT.md` 同步补充交互说明。

---

## [0.5.3] - 2026-03-14

### 🗑️ Removed

1. **移除 xlsx 适配器（重大瘦身）**
   - 删除 `src/adapters/xlsx.js`、`tests/xlsx.test.js`、`examples/xlsx-adapter/`（含 README、index.html、index.standalone.html、scenario.config.js、scenarios/*、templates/README.md）及 `dist/adapters/xlsx.cjs`。
   - 从 `package.json` 移除 `exceljs` 依赖，传递依赖减少约 95 个；CLI 产物从约 3.0MB 降至约 953KB。
   - `scripts/build.mjs` 移除 xlsx 构建步骤；`scripts/publish-release.mjs` 发布资产从 7 个减至 6 个（移除 `adapters/xlsx.cjs`）。
   - `src/core.js` / `src/browser/legacy/core.js` 移除 xlsx 相关注释；`README.md`、`docs/ADAPTER_GUIDE.md`、`examples/EXAMPLES_INDEX.md` 同步移除 xlsx 引用。

### ⚠️ Breaking Changes

1. **xlsx 适配器被移除**
   - v0.5.3 起不再内置 xlsx 适配器，发布资产中也不再提供 `adapters/xlsx.cjs`；依赖 `prepareXlsx` 等 xlsx 能力的场景将无法再开箱即用。

### 🐛 Bug Fixes

1. **修复版本锁缺失/损坏时的升级死锁**
   - `init` 的 `shouldRefreshFramework` 在版本锁缺失或损坏时不再静默跳过刷新，改为复用 `doctor` 的 UMD/DTS 版本探测逻辑，版本锁异常时可自愈（涉及 `src/cli.js`、`src/doctor.js`）。

### 🔒 Security

1. **升级 postcss 至 8.5.26 修复 CVE**
   - `package.json` 新增 `npm overrides` 将 `postcss` 强制升级到 `8.5.26`，并重建 `package-lock.json`，消除已知漏洞。

### 📚 Documentation

1. **v0.3 历史资料归档**
   - 8 个 v0.3 历史文档迁移至 `docs/archive/`（FINAL_REVIEW、GITLAB_RELEASE_GUIDE、HOW_TO_VIEW_EXAMPLES、READINESS_ASSESSMENT、RELEASE_GUIDE/RELEASE_NOTES/RELEASE_SUMMARY_v0.3.0、SECURITY_FIX_PLAN），新增 `docs/archive/README.md` 说明仅作历史参考、不再维护；删除整个 `docs/fix-examples/` 目录（11 个 v0.3 时期代码示例与评估文档）。

2. **文档内容收敛与示例流程统一**
   - `docs/INTERNAL_USAGE_GUIDE.md` 与 `docs/ADAPTER_GUIDE.md` 将断言语法从 v0.3 旧形式更新为操作符键形式。
   - `docs/INTERNAL_USAGE_GUIDE.md` 6 处及 `examples/complete/README.md`、`examples/security-best-practices/README.md`、`examples/EXAMPLES_INDEX.md` 共 8 处「直接打开 index.html」统一为「必须 serve 启动」。
   - `docs/AI_INSTALL_PROMPT.md` 版本号及安装命令中的 release 资产下载链接同步到 v0.5.3。

### Migration Guide: v0.5.2 → v0.5.3

1. **使用 xlsx 适配器的用户**：升级前请自行导出/保存 xlsx 适配器实现，或继续使用 v0.5.2。
2. 其余用户无 breaking change；若此前遇到过版本锁缺失/损坏，升级后重新执行 `init`（不传 `--force`）即可自愈版本锁。

---

## [0.5.2] - 2026-08-10

### ✨ Integration Experience

1. **业务项目只需复制一次接入 Prompt**
   - AI 自动完成固定版本安装、`init`、`doctor`，随后读取项目内生成的 `AI_SCENARIO_PROMPT.md` 并询问目标业务功能。
   - 用户不再需要理解两阶段流程、复制第二份 Prompt、学习 DSL 或手工维护 `scenario.config.js`。
   - 新 AI 会话可用一句短命令读取项目内规则并继续设计场景。

2. **按单个业务功能设计场景矩阵**
   - 业务功能作为设计和目录边界，场景作为成功、校验、权限、边界、幂等或状态流转等独立验证路径。
   - 禁止扫描整个项目批量生成，或把多个业务功能串成一个大场景。
   - 推荐使用 `scenarios/<功能标识>/<验证路径>.js` 和 `<功能标识>-<验证路径>` 场景 id。

3. **更安全、更精简的初始化目录**
   - 新项目根层只保留 `README.md`、`index.html` 和 `scenario.config.js`；CLI、浏览器运行时、AI 规则、类型声明、能力清单和版本锁集中到 `.scenario-test/`。
   - 默认 `globals` 改为空，避免项目未配置时发送占位请求头。
   - 失败分支默认拆为独立场景；`failurePolicy: "continue"` 仅用于同一验证路径内继续收集步骤结果。
   - README、接入 Prompt、示例索引和 init 生成文档统一为同一使用流程。

4. **旧项目布局兼容**
   - init 检测到旧平铺框架文件或旧版 `index.html` 引用时继续原位更新，不强制迁移，不生成新旧混合布局。
   - 版本锁与当前 CLI 版本不一致时，仅刷新框架管理文件；`scenario.config.js`、`scenarios/` 和项目 README 保持不变。
   - doctor 与 init 共用同一布局判定，一次只选择 `.scenario-test/` 新布局或旧平铺布局。

### Migration Guide: v0.5.1 → v0.5.2

1. 无 DSL 或 CLI breaking changes。
2. 新项目直接使用 v0.5.2 AI 接入 Prompt。
3. 既有平铺项目重跑 v0.5.2 `init` 时继续使用原布局，不需要迁移；如需采用隐藏目录，只能在备份并确认项目差异后人工迁移，不能直接使用 `init --force`。

---

## [0.5.1] - 2026-08-10

### 🐛 Bug Fixes

1. **浏览器 legacy includes/oneOf/extract 与 Node 同语义**
   - `includes`：actual 为数组时改用 JSON 深比较 `some`（修复 `[10,20]` 被字符串化导致 `includes: 2` 假阳性）；非数组保持子串包含。
   - `matches`：无效正则时断言失败而非抛异常（与 Node 一致）。
   - `oneOf`：expected 必须为数组（含模板变量解析后），否则断言失败而非抛异常。
   - `extract`：来源解析与 Node `src/core.js` 完全同语义（`target:'status'`/`header` 简写优先，`from: headers/bodyText/response`，默认 body）；路径取值改为基于解析后的 source。
   - 新增 `tests/parity.test.js`：浏览器 legacy 与 Node 断言语义一致性测试，禁止静默漂移。

2. **版本锁 SHA256 同版本替换后可刷新**
   - `init` 的 `writeVersionLock` 在版本号一致时也校验框架管理文件（CLI/UMD/d.ts/capabilities）SHA256：任一文件被手工替换/缺失即重算哈希刷新锁，保证 doctor 版本握手恢复健康。

3. **d.ts VERSION 正式导出**
   - `src/index.js` 正式导出 `VERSION`（来自 `version.generated.js`），`tests/dts.test.js` 新增导出一致性测试（d.ts 声明与运行期值一致）。

4. **createApp 返回类型**
   - `scenario-test.d.ts` 新增 `ScenarioApp` 接口，`createApp` 返回类型由 `void` 修正为 `ScenarioApp`（覆盖三方常用入口 loadScenario/runAll/runNext/reset/cancel/rewindToStep/rerunStep/destroy/getState）。

5. **doctor 绝对路径判断与 run 一致**
   - `doctor` 不再拒绝场景清单中的绝对路径（与 `run` 一致可正常执行），改为 WARN 提示建议使用配置目录内相对路径；相对路径仍保留配置目录内越界校验（防路径遍历）。

6. **doctor 缺配置时输出 JSON 报告**
   - 配置文件缺失不再提前抛错：输出 `config` FAIL 检查项，版本/文件握手等其他检查继续执行，`--json` 仍输出结构化 JSON（新增顶层 `status` 字段，`OK`/`FAILED`）。

### Migration Guide: v0.5.0 → v0.5.1

1. 无 breaking changes；DSL 与 CLI 行为保持不变。
2. 既有项目升级：使用新版 CLI 执行 `init`（不传 `--force`，刷新版本锁 SHA256），再运行 `doctor` 验证。
3. `doctor --json` 报告新增顶层 `status` 字段；配置文件缺失时输出名为 `config` 的 FAIL 检查项（原行为为直接抛错退出）。

---

## [0.5.0] - 2026-08-10

### ✨ 三方能力发现闭环

1. **DSL Contract 单一真相（`src/contract.js`）**
   - 新增不可变机器可读 `contract`（contractVersion 从 1 开始；runtimeVersion 复用 `version.generated.js` 的 VERSION）。
   - 断言元数据键与操作符（含说明与类型约束，数值比较操作符 `gt/gte/lt/lte` 标注 `finiteNumber`）、when 来源（仅 vars）、extract 字段/来源/required 语义、保留变量 `runId/runNo`、generatedVars 类型、config/scenario 关键字段（含 manual）、CLI 命令与参数均收敛到 contract。
   - `core.js` / `registry.js` / `engine.js` / `cli.js` 改为消费 contract，不再手写操作符、保留变量、when 来源等名单。
   - `defineScenario` 新增 generatedVars 类型定义期校验（原为运行期报错，合法场景行为不变）。
   - browser legacy 因架构自包含无法直接共享名单，已暴露 `ASSERTION_OPERATORS / ASSERTION_META_KEYS / RESERVED_VARS` 并新增一致性测试，禁止静默漂移。
   - 不引入 JSON Schema（本项目配置/场景是可执行 JS）。

2. **CLI `capabilities` 命令**
   - `node scenario-test-cli.cjs capabilities` 输出人类文本能力清单；`capabilities --json` stdout 纯净输出合法 JSON。
   - 构建产物 `dist/scenario-test-capabilities.json` 与 `capabilities --json` 同源（同一份 contract 投影），不维护第二套 JSON 源。
   - `--help` 更新展示 capabilities 与 doctor。

3. **CLI `doctor` 命令 + 项目版本锁**
   - `node scenario-test-cli.cjs doctor --config scenario.config.js [--json]`：复用现有 loader/defineConfig/defineScenario/path validation，不另写 DSL 校验器。
   - 检查 Node 版本（engines）、配置加载、场景清单 id/url 与文件存在性、场景文件加载与注册 id 匹配、manual 信息提示、CLI/UMD/d.ts/capabilities/版本锁版本一致性。
   - 汇总所有可继续检查的错误；有 FAIL 退出码 1，仅 WARN/INFO 退出码 0；每条 FAIL/WARN 给出“在哪里、为什么、如何修”。
   - init 新增框架管理文件 `.scenario-test-version.json`：记录 runtimeVersion、contractVersion、CLI/UMD/d.ts/capabilities 预期文件名、产物 SHA256、source/release 信息（不写本机路径）。
   - 新项目 init 写入版本锁；既有项目缺版本锁时 doctor 仅 WARN 并给出补齐提示；doctor 只校验本地固定版本，不联网检查最新版本。
   - 不实现 upgrade 命令，仅建立所有权与版本锁基础。

4. **`scenario-test.d.ts` 零安装类型声明**
   - 从 contract 投影生成 `dist/scenario-test.d.ts`（操作符/保留变量/类型名单由脚本生成，禁止手工复制漂移；构建/测试校验一致）。
   - 覆盖 ScenarioConfig / Environment / ScenarioListItem(manual) / ScenarioDefinition / Step / RetryUntil / Assertion / ExtractDefinition / WhenDefinition 与 createApp / createEngine / defineConfig / defineScenario / registerConfig / registerScenario 等公共导出；UMD 全局通过 `export as namespace ScenarioTest` 声明。
   - init 复制 d.ts 到项目场景测试目录，纯 JS 项目可通过 `// @ts-check` + `/** @type {import('./scenario-test').ScenarioDefinition} */` 获得 IDE 提示；消费者无需 npm install。
   - package.json 增加 `types` 指向 dist，不新增破坏深层导入的 `exports` 字段。

5. **文档与 init 投影**
   - `docs/AI_INSTALL_PROMPT.md` 更新到 v0.5.0 固定版本 URL；examples 索引版本标记同步；GitLab 文档标注内部/历史，明确 GitHub Release 是对外正式渠道。
   - 澄清 `--authorization` 仍兼容但已弃用（不宣称 0.4.0 已移除）。
   - init 生成 AI_SCENARIO_PROMPT.md / SCENARIO_PATTERNS.md / README.md 的能力名单从 contract 投影，不再手抄操作符名单。
   - 文件所有权：runtime / d.ts / capabilities / 版本锁 / AI Prompt / Patterns 属框架管理；scenario.config.js、scenarios/*.js 属项目管理（init 默认不覆盖，本轮不新增覆盖升级行为）。

6. **发布资产**
   - 未来 Release 文件清单新增 `scenario-test.d.ts` 与 `scenario-test-capabilities.json`（共 7 个产物；版本锁由 init 生成，非独立发布产物）。

### 🧪 Tests

- `tests/contract.test.js`：contract 与 core/legacy 操作符、保留变量、元数据键一致；contract.engines 与 package.json engines 一致。
- `tests/capabilities.test.js`：capabilities 文本与 JSON 输出；`--json` stdout 可解析且纯净；与 build 产物 `dist/scenario-test-capabilities.json` 一致。
- `tests/doctor.test.js`：健康项目全 PASS；未知操作符场景 FAIL；多文件错误汇总；无版本锁 WARN；版本不一致 FAIL；manual INFO；退出码语义。
- `tests/dts.test.js`：d.ts 包含 contract 全部操作符/保留变量/类型名单；用全局 `tsc --noEmit` 验证最小 JS/TS 用例（不新增 devDependency）。
- `tests/init.test.js`：init 写入 d.ts/capabilities/版本锁；重跑默认不覆盖项目配置/场景；版本锁在版本一致时保留、不一致时更新。

### Migration Guide: v0.4.x → v0.5.0

1. 无 breaking changes；0.4.0 的 DSL 与 CLI 行为保持不变（`--authorization` 仍兼容）。
2. 新项目 init 会自动写入 d.ts / capabilities.json / `.scenario-test-version.json`。
3. 既有项目升级：使用新版 CLI 对项目执行 `init`（不传 `--force`，不会覆盖项目文件），再运行 `doctor` 验证；缺少版本锁时 doctor 会 WARN 并提示补齐。
4. `defineScenario` 对 generatedVars 的未知 type 报错时机从运行期提前到定义期（非法配置更早暴露）。

---

## [0.4.0] - 2026-08-10

### ⚠️ Breaking Changes

1. **断言 schema 严格化（BREAKING）**
   - 断言定义只允许元数据键 `name / path / from / target / header / implicit` 与操作符键，未知键在定义期（`defineScenario`）与执行期（`evaluateAssertion`）立即抛错，错误包含场景名、步骤名/序号、断言序号定位信息。
   - 每条断言必须至少包含一个操作符；`assertions: []` 或空对象不再合法。
   - 无显式断言的步骤仍自动追加 HTTP 2xx 隐式断言，不受影响。

2. **新增数值比较操作符 `gt / gte / lt / lte` 与 `notEquals`**
   - `notEquals` 与 `equals` 一样采用 JSON 深比较后取反。
   - `gt/gte/lt/lte` 只接受 actual 与 expected 均为有限 number，不做字符串隐式转换；类型不符时断言失败（不是抛执行异常），并保留 actual/expected 用于报告。整段模板 `{{vars.x}}` 解析出数字时正常参与比较。
   - 此前用 `matches` 模拟数值比较的断言可迁移为 `gte: 5` 等；若业务语义要求"整数"（如返回条数必须为非负整数），请继续使用 `matches: "^\\d+$"`，不要用 `gte: 0` 代替（`gte: 0` 允许 1.5）。

3. **`when` 对象形式只允许 `from: "vars"`**
   - 对象形式条件（如 `{ from: "vars", path: "id", exists: true }`）不允许 `from: "body"/"status"/"header"` 与 `target/header` 键，定义期明确报错；非对象形式（模板字符串/布尔）真值语义保持不变。未引入 `and/or/not` 与 `lastResponse` 条件。

4. **保留变量保护：`runId / runNo` 禁止声明或覆盖**
   - `scenario.vars`（定义期）、config/options vars、`scenario.envVars`、`generatedVars`、`extract` 均不得声明或覆盖 `runId / runNo`，冲突在使用前尽早报错。

5. **extract 增强**
   - `required: true` 且路径不存在时当前步骤失败（可配合 `retryUntil` 轮询直到字段出现）。
   - `required` 默认 `false`：路径不存在保持兼容（变量为 undefined），但产生 warning；warning 进入步骤结果并由 CLI（`[WARN]`）与浏览器 UI（报告"警告"行）展示，不含响应敏感值。

6. **SKIP 可观测性（行为变更）**
   - SKIP 步骤仍返回 `skipped: true`（步骤对象保留 `passed: true` 以兼容既有调用），但聚合统计不再把 SKIP 计入通过/执行数。
   - 场景报告新增 `status`（`PASSED / FAILED / SKIPPED`）与 `passedSteps / failed / skipped / executed`；`executed` 只统计实际执行请求/适配器的步骤。
   - 部分 PASS + 部分 SKIP 且无失败时场景状态为 `PASSED`，SKIP 单独计数。
   - CLI 输出 `[SKIP]` 标记，摘要分别显示 passed/failed/skipped/executed/planned；新增 `--fail-on-skip`（默认 false），开启后任何 skip 导致最终退出码 1。
   - 浏览器工作台同步显示跳过统计（统计面板、过滤按钮、AI 报告）。

7. **manual 场景隔离**
   - 配置场景项支持 `manual: boolean`（严格校验类型）。
   - `--all` 默认排除 `manual: true` 场景；`--scenario <id>` 可显式执行；全部为 manual 时 `--all` 报错并提示使用 `--scenario`。
   - 未实现 tags、多值/前缀匹配、文件直跑。

### 🐛 Bug Fixes

- 修复 `runtime.vars` 被冻结时 extract 写入失败的问题（保留变量改为定向保护，不再冻结整个 vars）。
- 修复 `when` 对象形式在校验前即可绕过断言名单的问题（定义期与执行期双重校验）。

### 🧪 Tests

- `tests/core.test.js`：五个新增操作符 pass/fail、数字类型边界、未知操作符、无操作符、执行期非法断言。
- `tests/engine.test.js`：when 校验、保留变量冲突、extract required/warning、SKIP 聚合（全跳过/部分跳过）。
- `tests/cli.test.js`：`--all` 排除 manual、显式场景执行、`--fail-on-skip` 退出码、`[SKIP]` 与摘要格式。
- `tests/browser.test.mjs`：浏览器 UI SKIP 统计显示。

### Migration Guide: v0.3.x → v0.4.0

1. 若断言对象含非名单键（如自定义备注字段），请删除或移入 `name`。
2. `matches: "^[5-9]|[1-9]\\d+$"` 类数值断言可替换为 `gte: 5`；纯非负整数断言保留 `matches: "^\\d+$"`。
3. `when: { path: "code", equals: 200 }`（无 `from`）需改为 `when: { from: "vars", path: "code", equals: 200 }`；基于响应体的条件不被支持，请改为 extract 后基于 vars 判断。
4. 不要在任何变量源声明 `runId / runNo`。
5. 全场景 SKIP 时 CLI 退出码仍为 0（除非 `--fail-on-skip`），但报告状态为 `SKIPPED`，与 FAILED 明确区分。

---

## [0.3.0] - 2026-08-08

### 🔒 Security Fixes (BREAKING CHANGES)

#### CRITICAL
- **路径遍历防护**: 所有文件操作（XLSX 适配器、文件上传、响应保存）现在都验证路径边界，阻止访问工作区外的文件
- **插件路径限制**: 插件必须在配置目录内，外部插件需要 `--allow-external-plugins` 标志
- **vm.runInContext 文档**: 添加安全警告，说明场景文件的执行权限

#### HIGH
- **环境变量授权**: 推荐使用 `SCENARIO_AUTH` 环境变量代替 `--authorization` 参数（命令行参数在进程列表中可见）
- **环境变量名遮蔽**: 生产模式下错误消息不再显示环境变量名，防止信息泄露
- **路径验证工具**: 新增 `src/utils/path-validator.js` 统一路径安全验证

#### MEDIUM
- **不可变 Runtime Vars**: `runtime.vars` 现在被 `Object.freeze()` 冻结，防止意外修改
- **重试超时保护**: 添加默认 5 分钟总超时（`maxElapsedMs`）和最小 100ms 重试间隔

### ⚠️ Breaking Changes

1. **授权方式变更**
   ```bash
   # ❌ 旧方式（已弃用，但仍可用）
   node scenario-test-cli.cjs --authorization "Bearer token"
   
   # ✅ 新方式（推荐）
   export SCENARIO_AUTH="Bearer token"
   node scenario-test-cli.cjs --config scenario.config.js
   ```

2. **插件路径限制**
   ```javascript
   // ✅ 安全：项目内插件
   { plugins: ["./plugins/custom.js"] }
   
   // ❌ 需要标志：外部插件
   // 运行时需要: --allow-external-plugins
   { plugins: ["/tmp/plugin.js"] }
   ```

3. **文件路径验证**
   - 绝对路径现在会被拒绝
   - `..` 路径遍历会被拒绝
   - 所有路径必须在工作区内

### 📝 New Features

- 新增 `--allow-external-plugins` 标志允许加载外部插件
- 环境变量 `SCENARIO_VERBOSE_ERRORS=true` 启用详细错误消息（开发模式）
- 新增 `SECURITY.md` 安全指南文档
- 新增路径验证工具 API: `validatePath()`, `validatePaths()`, `isPathSafe()`

### 🐛 Bug Fixes

- 修复路径遍历安全漏洞（CVE-待分配）
- 修复环境变量名泄露问题
- 修复无限重试可能性

### 📚 Documentation

- 添加 `SECURITY.md` 安全最佳实践
- 更新 CLI 帮助文档
- 更新 README.md 安全章节

### 🧪 Tests

- 新增 `tests/security-fixes.test.js` 安全测试套件
- 路径遍历攻击测试
- 不可变性测试
- 输入验证测试

---

## [0.2.13] - 2026-07-XX

### Features
- 浏览器工作台和 Node.js CLI 双模式
- 声明式 DSL
- AI 安装 Prompt

### Improvements
- 零依赖部署
- 单文件引入

---

## Migration Guide: v0.2.x → v0.3.0

### 1. 授权方式迁移

**影响**: 所有使用 `--authorization` 的脚本

**迁移步骤**:
```bash
# 步骤 1: 创建 .env 文件（不要提交到 Git）
cat > .env << EOF
SCENARIO_AUTH="Bearer your-token-here"
EOF

# 步骤 2: 加入 .gitignore
echo ".env" >> .gitignore

# 步骤 3: 更新运行脚本
# 旧脚本
node scenario-test-cli.cjs --authorization "Bearer token" --all

# 新脚本
export $(cat .env | xargs)
node scenario-test-cli.cjs --all
```

**向后兼容**: `--authorization` 仍然可用，但会显示弃用警告。计划在 v0.4.0 移除。

### 2. 插件路径迁移

**影响**: 使用 `nodePlugins` 的配置

**迁移步骤**:

如果插件已经在项目内：
```javascript
// ✅ 无需修改
{
  nodePlugins: ["./plugins/custom-adapter.js"]
}
```

如果使用外部插件：
```bash
# 选项 1: 复制插件到项目内（推荐）
cp /external/plugin.js ./plugins/

# 选项 2: 使用 --allow-external-plugins 标志
node scenario-test-cli.cjs --allow-external-plugins --all
```

### 3. 文件路径迁移

**影响**: 使用绝对路径或路径遍历的场景

**迁移步骤**:
```javascript
// ❌ 旧方式 - 会报错
{
  prepareXlsx: {
    template: "/absolute/path/template.xlsx",
    output: "../output/result.xlsx"
  }
}

// ✅ 新方式 - 使用相对路径
{
  prepareXlsx: {
    template: "templates/template.xlsx",
    output: "output/result.xlsx"
  }
}
```

### 4. 错误处理更新

**影响**: 解析错误消息的代码

生产环境错误消息格式已更改：
```javascript
// 旧格式
"缺少场景变量 PROD_API_SECRET（映射到 vars.apiSecret）"

// 新格式
"缺少必需的场景变量: vars.apiSecret
提示: 请在配置文件的 vars 中设置该变量，或通过环境变量提供"
```

开发环境可设置 `SCENARIO_VERBOSE_ERRORS=true` 查看详细信息。

---

## Testing the Migration

测试迁移是否成功：

```bash
# 1. 运行安全测试
npm test
node --test tests/security-fixes.test.js

# 2. 测试现有场景
export SCENARIO_AUTH="your-token"
node scenario-test-cli.cjs --config scenario.config.js --all

# 3. 检查是否有弃用警告
# 如果看到警告，按照上述步骤迁移
```

---

## Support

如有迁移问题，请：
1. 查看 `SECURITY.md` 安全指南
2. 提交 GitHub Issue
3. 联系项目维护者

# 功能覆盖矩阵（coverage-matrix）

- 审计人：测试工程师（T01/T05，独立审计）。第 1 轮：2026-11-06 上午；第 2 轮：~12:00 快照；第 3 轮（T05 终验审查）：2026-11-06 ~13:00 快照。
- 审计对象：分支 `test/comprehensive-coverage`，基线 `3553b6a`（feat(report): 增加字段差异证据、离线报告与耗时提取）+ 工作树未提交并行产出（研发 1/2 开发文件、MausBot 接线的 package.json/CI/.gitignore）。
- 事实来源：`src/contract.js`（contractVersion 21）、`src/capabilities.js` 投射、`README.md`、`src/cli.js` 命令面、既有测试清单。
- 授权范围：本文件是本轮唯一写入文件（docs/testing/）。未运行任何测试或构建（避免并行负载冲突）；对开发产出与 CI 接线改动只读核实。

> **第 2 轮修正**：第 1 轮 §4.1 误写矩阵总数「76 行」，实际 ID 行机器枚举为 **112 行**（15+10+6+8+3+2+15+9+18+6+10+10），已改按机器枚举口径；状态口径改为「存在 / CI 纳入 / 已执行」三维度（§0）。

> **第 3 轮（T05 终验审查，~13:00 快照）**：研发已停止改动。QA 只读复核了全部修复与新测试的**代码与接线**（未执行）：变异清单扩至 **50 个**（M01–M50 连续，find-once 静态校验全过）、runner 重写（killed 仅认 ERR_ASSERTION、schema 3、自测 12 故障用例）、comprehensive* 用例 **65→74**、coverage-fixes **2→8**、browser-comprehensive **12→17 检查**（src+dist 双模式接 CI）。G3/G4/G5/G7/G9/G10/G11 在代码层闭合；**执行结论一律待统一验证结果**（MausBot 单进程串行验证），本矩阵不代跑、不预支绿灯。

> **第 4 轮（2026-11-14，G8 收口 + 执行维度回填）**：CONS-07、CONS-09 于远程 214 执行通过（skill-e2e python 4/4 + java 9/9 步；A/B current×6 变异 54/54 杀死），G8 全闭合。**T05 遗留「执行待统一结果」已由 CI 持续验证回填**：`unit`（双平台 ×node22/24，含 coverage-fixes/comprehensive*/score-design-eval/runner 自测）、`browser-comprehensive` src+dist、`mutation`、`e2e` 在每个 push 全绿；最近 run `a7b0427` 全 job success。历史「执行待统一结果」行按本快照口径理解为「已由 CI 执行通过」，不再逐行改写。

## 0. 如何读本矩阵（状态图例）

**证据三维度**（第 2 轮起，不再把"有证据"混作一义）：

| 维度 | 含义 |
| --- | --- |
| 存在 | 有既有测试（文件+用例名）登记为证据；本轮新增并行测试按快照登记 |
| CI 纳入 | 对应文件被某 CI job 实际执行（unit / browser / types / mutation） |
| 已执行 | QA 本轮实际运行并核实结果。**本轮全部为「否」**（静态审计约束）；开发自报的执行登记为"自报"，以 artifact 佐证 |

**覆盖状态**：

| 状态 | 含义 |
| --- | --- |
| 有证据 | 存在测试且纳入 CI（是否已执行看"已执行"维度） |
| 部分 | 有测试但未覆盖该功能的全部正/反/边界面（缺口注明） |
| 待验证 | 无既有测试，依赖并行开发新增（研发补充中） |
| 未验证 | 证据存在但无法在本环境执行（远程 214 等），或新接入 CI 尚未运行 |
| 不适用 | 纯文档/展示/环境受限能力，不要求业务测试或变异（理由注明；**豁免 ≠ 验收通过**） |

**关键限制（必读）**：
1. 本矩阵是**静态审计**产物：QA 未运行任何测试或构建（避免并行负载冲突）。「已执行」维度由 CI 运行与 T05 最终独立复测回填。
2. **CI 全绿 ≠ 功能全覆盖**。CI 只证明"已被矩阵行锁定的行为未回归"；矩阵回答的是"哪些行为有锁定、哪些没有"。两者不可互推。
3. 文件存在 ≠ 覆盖，**接线 ≠ 已验证**：`browser-comprehensive`（**17 检查**，src+dist 双模式）与 `tests/mutation/`（**50 变异体 + runner 自测 12 用例**）已接入 package.json/CI/.gitignore（MausBot 接线，第 3 轮 QA 只读核实 diff 与脚本本体），执行结果仍待统一验证/CI 确认。
4. 不声称穷尽所有输入组合或全部变异空间；50 个变异体为有界选点（见 §4.5），浏览器工作台端不在变异范围（选点集中在 src/ 确定性路径）。
5. 研发已停止改动（T05 前提）。本矩阵按 2026-11-06 ~13:00 快照登记；执行维度由统一验证进程（单进程串行）回填，QA 不并行跑测试/构建。**注（2026-11-14）**：T05 的「统一验证进程」未单独跑，但其覆盖的测试集已全部接入 CI 且每次 push 持续通过（见第 4 轮快照）——执行维度以 CI 为准。

## 1. 方法论：正例 / 反例 / 边界 / 变异的一般做法

- **正例（happy path）**：对契约声明的每个行为，至少一条"输入 → 期望输出"的锁定用例。
- **反例（failure path）**：三类——定义期非法输入必须快速失败（如拼错键、非法类型）；运行期失败路径（断言失败、超时、取消）；错误信息可定位（含场景/步骤/断言编号）。
- **边界（edge）**：空值/空数组/恰好到限（边界值 ±1）/互斥组合/缺省与回退链。
- **变异测试（mutation）**：对实现注入微小改动（翻转比较符、偏移边界 ±1、移除钳制、改默认值、交换分支），在隔离副本上重跑测试；**每个变异体至少应有一个既有用例失败**，否则该变异"存活"=该处行为没有被任何用例锁定，即覆盖缺口。存活变异清单是"哪些测试是假绿"的直接证据。
- **本仓库落地**：`src/contract.js` 是 DSL 唯一事实来源，矩阵按契约能力逐行展开；变异只在隔离副本执行、不改主实现（tasks.md 约束），选点按矩阵"变异建议"列有界执行；不引入行覆盖率门禁（行覆盖率不等于行为覆盖）。

## 2. CI 与测试入口现状（2026-11-06 审计）

| 入口 | 内容 | CI（.github/workflows/ci.yml） |
| --- | --- | --- |
| `npm run test:unit`（scripts/run-tests.mjs） | `tests/*.test.js` 全量（快照 69 个文件：既有约 580 用例 + comprehensive* **74** + coverage-fixes **8**） | unit 矩阵：ubuntu+windows × node 22/24，含 build + dist 新鲜度 + check:eol。Windows 下 comprehensive-cli 1 项 Linux-only 用例显式 SKIP（runner 对 SKIP 单列且退出码非零） |
| `npm run test:browser` | `tests/browser.test.mjs`（Playwright 单脚本端到端） | browser job（ubuntu，chromium） |
| `npm run test:ui-style` | `tests/ui-style.test.mjs` | browser job |
| `npm run test:browser-comprehensive`（src 模式） | `tests/browser-comprehensive.test.mjs` 工作台端正反例 **17 项检查**（`SCENARIO_TEST_BROWSER_RUNTIME` 缺省=src） | browser job 步骤 + test:all/check；**已接线未执行** |
| `npm run test:browser-comprehensive:dist`（dist 模式，第 3 轮新增） | 同一测试文件以 `SCENARIO_TEST_BROWSER_RUNTIME=dist` 验收 **dist 产物**（scripts/run-browser-comprehensive.mjs 包装）；browser job 内先 `npm run build` 再跑，验收新鲜 dist | 同上；src/dist 双验收完成（G1/G2 闭合于代码层） |
| `npm run test:mutation`（第 3 轮重写） | `tests/mutation/` **50 变异体**（M01–M50）+ 隔离副本 runner（schema 3，killed 仅认断言失败 ERR_ASSERTION）+ **runner 故障自测 12 用例**（`test:mutation` = 自测 && 全量跑） | **独立 mutation job**（ubuntu node 24，30min 上限，artifacts 永远上传留 7 天；survived/infra/skipped 非零退出，excluded 平台排除不算失败）。M50 声明 `platforms=["linux"]`：Windows 本地 excluded（不进分母），ubuntu CI 上真实执行 |
| `tests/coverage-fixes.test.js`（研发2 新增，第 3 轮扩至 8 用例） | 修复验收：G9 JUnit notRun（bail×多行数据）、G10 敏感链（首步重试/动态提取值/字面请求/vars+generatedVars 特殊字符 ×2/兼容开关）、G5 serve --reassign | 归入 test:unit；对应 src 修复已在工作树（QA 只读核实代码路径），**执行待统一结果** |
| `tests/e2e/`（确定性发布消费链，新增） | 真实执行安装脚本（install.sh/install.ps1）+ 初始化工程 `run` 对 fixture-api 全链 | **已接入 CI**（独立 `e2e` job：ubuntu-24.04 + windows-latest，node 22，build→test:e2e）；本地 `npm run test:e2e` 可跑——闭合 G8 的**确定性段** |
| `tests/skill-e2e/`、`tests/fixtures/scenario-design/` | 接入-执行冒烟、场景设计 A/B | 不在 CI：仅在 192.168.1.214 执行（AGENTS.md 约定）—— G8 **LLM 段仍未验证**（确定性段已由 `tests/e2e/` 闭合） |
| CI types job | `tsc --noEmit dist/scenario-test.d.ts` + `tests/dts.test.js` | 是 |

## 3. 覆盖矩阵

### A. DSL 断言操作符（contract.assertions.operators）

| ID | 功能 | 正例证据 | 反例证据 | 边界证据 | CI | 变异建议 | 缺口 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| OP-01 | `exists` | issue-111-exists-boolean.test.js「#111 exists 语义保持 boolean 直判」；parity.test.js「断言求值极性：全部操作符逐条锁定 passed（含 exists 假绿回归）」 | issue-111「非 boolean 的 exists 定义期即拒绝」「when 对象同一口径」 | parity「exists 空串为不存在」 | unit | 翻转存在判定/把 null 视为存在 → parity+issue-111 应杀 | — |
| OP-02 | `equals` | core.test.js「equals/notEquals/includes/oneOf 深比较对对象键序不敏感」；parity 深比较语义 | core「BigInt 等 JSON 不可表示值：深比较可正常判定」 | parity「null 实际值保留原始值」「缺失模板变量解析为空串」 | unit | 深比较退化为引用比较/键序敏感 → core 应杀 | — |
| OP-03 | `notEquals` | core.test.js「五个新增操作符 pass/fail」 | issue-131-134.test.js「notEquals 相等失败」 | 同上深比较边界 | unit | 取反遗漏（equals 行为）→ issue-131 应杀 | — |
| OP-04 | `includes` | parity「includes 数组不字符串化」；cli.test.js「includes 对象实际值失败输出语义化原因」 | core「includes 对象实际值：断言失败并透出语义化引导」 | core「空候选集合的 oneOf/includes 直接失败」 | unit | 字符串化数组后包含 → parity/cli 应杀 | — |
| OP-05 | `each` | parity.test.js「each 逐项断言：子断言数组与相对 path」「模板变量与非法形状 fail-fast」 | parity「each 失败明细：detail 透出失败元素下标」；cli.test.js「失败输出单列 each 元素级明细行（嵌套递归）」 | parity「空数组 every 语义」；issue-73「可在 each 子断言内嵌套」 | unit | 空数组改为失败/子断言 path 改绝对 → parity 应杀 | — |
| OP-06 | `shape`（jsonSchema-lite） | issue-73-shape.test.js（11 项：必填/类型/嵌套/enum/each 嵌套/组合） | issue-73「缺失必填、类型不符、嵌套数组元素失败均给出字段级明细」「未识别键/非法 type/非法子 schema 定义期即拒」 | issue-73「additionalProperties 默认 true，false 时未知键失败」；features-dsl.test.js「#73 additionalProperties/enum 与 each 组合」 | unit | 放松 type 校验/忽略 additionalProperties → issue-73 应杀 | — |
| OP-07 | `matches` | core.test.js「matches 缓存按解析后的期望值键控」；parity 极性 | core「非法正则 fail-fast，模板期望值跳过」 | core「模板值变化时互不串扰」 | unit | 正则改为子串包含 → parity 应杀 | — |
| OP-08 | `oneOf` | core.test.js「oneOf 深比较键序不敏感」；issue-131「oneOf 标注候选」 | parity「oneOf 非数组必须失败」；core「空候选集合直接失败」 | issue-131「多操作符不伪造差异」 | unit | 非数组期望静默字符串化 → parity 应杀 | — |
| OP-09 | `startsWith` | parity.test.js 行 92-99（极性、模板期望、header 简写） | parity 反例行（"3" 对 "2xx" 等） | parity「空串期望」「缺失模板变量」 | unit | 大小写改为不敏感/去掉 null→空串 → parity 应杀 | — |
| OP-10 | `endsWith` | parity.test.js 行 100-102 | 同上极性组 | 同上 | unit | 同 OP-09 | — |
| OP-11 | `length` | core.test.js「length 操作符：数组/字符串/对象键数精确比较」；engine.test.js「length 断言数组条数端到端（含 retryUntil 终态）」 | core「非容器类型直接失败」 | issue-131「length 组合保留原始比较证据与 actual 语义」 | unit | 改为 ≥/去容器判定 → core/engine 应杀 | — |
| OP-12 | `gt` / `gte` | core.test.js「数字比较断言：类型不符合时断言失败而非抛异常」；parity 极性 | 同上（含 actual/expected 保留） | contract「finiteNumber 不做字符串隐式转换」由 parity 锁定 | unit | 边界偏移 ±1（gt↔gte 混淆）→ parity 应杀 | — |
| OP-13 | `lt` / `lte` | 同 OP-12 组 | 同上 | 同上 | unit | 同 OP-12 | — |
| OP-14 | `target: duration` 断言 | core.test.js「target: duration 断言单次请求耗时」；engine.test.js 同名端到端 | issue-131-134「#134 duration 目标复用毫秒值，缺失遵循 required/default」 | engine「response.durationMs 随结果透出」 | unit | 单位改为秒/剔除重试等待语义 → engine 应杀 | — |
| OP-15 | 默认 2xx 断言（未声明时） | core.test.js「未声明断言时默认要求 HTTP 2xx」 | engine.test.js「无显式断言的 HTTP 500 不得通过」 | core「默认 2xx 断言不误伤本地适配器（status=LOCAL）」 | unit | 移除默认断言 → engine 应杀 | 注：comprehensive-cli「C1 HTTP 200 + 业务失败且无断言」锁定已知语义边界（默认断言只校验传输层状态，业务失败需显式断言，用例标注风险；变异 M32 锁定） |

### B. 提取 extract（contract.extract）

| ID | 功能 | 正例证据 | 反例证据 | 边界证据 | CI | 变异建议 | 缺口 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| EX-01 | from:body 默认来源；裸 path 分词白名单 | parity.test.js「extract 契约：from 各来源」；core.test.js「断言、响应提取和 URL 拼接」 | engine.test.js「断言/extract 的 from、target、裸 path 定义期白名单与分词校验（拼错不再静默落 body 假绿）」 | core「引号键转义与畸形路径不得静默取值」 | unit | 拼错静默回退 body（历史假绿）→ engine 应杀 | — |
| EX-02 | from:headers 首段大小写不敏感 + header 简写 | parity「from:headers 配 path：头名大小写不敏感（与 header 简写口径一致）」「extract from:headers 配 path」 | 同测试负向行 | parity「通用 response 路径仍精确匹配」 | unit | 改回精确匹配 → parity 应杀 | — |
| EX-03 | from:bodyText | parity（bodyText 出现 12 处，含 extract 契约行） | parity 同组负向 | core.test.js 多处 | unit | body 解析错误地用于 bodyText → parity 应杀 | — |
| EX-04 | from:response 精确键匹配 | parity「通用 response 路径仍精确匹配」 | — | — | unit | 与 headers 不敏感口径混淆 → parity 应杀 | 部分：仅 parity 单测试锁定，反例偏薄 |
| EX-05 | target:status 提取 | parity「extract 契约：status 简写」 | engine「from、target 白名单校验」 | — | unit | status 改字符串类型 → parity 应杀 | — |
| EX-06 | required / default 语义与互斥 | core.test.js「extract default：按声明默认值兜底（支持模板），不产生 warning」；engine.test.js「extract required:true 路径不存在时步骤失败」 | core「required:true 与 default 互斥即抛错」「required:true 返回 failures」 | issue-121-edge-semantics.test.js「空响应体（204）按缺失处理」「空响应体 default 取兜底值」「body 字面量 null 仍是真实响应值」 | unit | default 写 null/required 改 warning → issue-121 应杀 | — |
| EX-07 | 缺失默认 warning（不含响应内容） | core.test.js「默认产生 warning 且不含响应内容」；engine.test.js 同口径 | — | engine「默认路径缺失产生 warning 并保持兼容」 | unit | warning 泄漏响应内容 → core 应杀（安全面） | — |
| EX-08 | scope:step / scope:suite | issue-69-suite-scope.test.js（6 项）；features-dsl.test.js「#69 后续场景复用登录 token」；features-cli.test.js「#69 CLI 多场景共享登录 token」 | issue-69「scope 定义期校验：只允许 step/suite」 | issue-69「不同 run 的 suite 相互隔离」；issue-69「CLI --concurrency>1 启动时 suite 快照」 | unit | suite 写丢失/跨 run 泄漏 → issue-69 应杀 | — |
| EX-09 | 通配路径 `[*]` | core.test.js「通配路径 [*]：数组逐元素取值…」「[*] 接入 extract/断言/模板」；engine.test.js「extract path [*] 通配提取数组列」 | core「非数组按路径缺失处理（required/default/warning 照常）」 | core「空数组产 []」「元素缺失子路径跳过」「连续通配展平」 | unit | 通配在非数组展开/产 undefined 洞 → core 应杀 | — |
| EX-10 | 保留变量与原型链安全（runId/runNo/__proto__ 等） | core.test.js「extract 不允许覆盖保留变量 runId/runNo」；engine.test.js「保留变量禁止在 config vars/generatedVars/envVars 声明」 | issue-43-proto-vars.test.js（4 项：定义期拒绝/直接写入不改原型/绕过定义期仍拒/自有键可读） | issue-36「__proto__ 作为自有数据键保留且不污染原型」；security-fixes.test.js「Runtime vars 不可变性」 | unit | 移除写侧拦截 → issue-43 应杀 | — |

### C. 模板与变量解析

| ID | 功能 | 正例证据 | 反例证据 | 边界证据 | CI | 变异建议 | 缺口 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TPL-01 | `{{vars.*}}` 插值类型保持 | core.test.js「模板插值保留完整表达式的原始类型和长整型字符串」 | — | issue-112-multi-template.test.js「整串单模板保留原类型，多模板拼接按字符串化规则」 | unit | 全部字符串化（类型丢失）→ core 应杀 | — |
| TPL-02 | 路径语法：引号键/负索引/畸形 | core.test.js「模板根写法支持引号键」「数组负索引 [-N]」「畸形路径不得静默取值」 | 同上 | core「tokenizePath 对外返回可变副本，缓存不受污染」 | unit | 畸形路径静默取值/缓存污染 → core 应杀 | — |
| TPL-03 | lastResponse / lastResponseBody 读取 | core.test.js「模板可读取 lastResponse / lastResponseBody 及其嵌套路径」 | engine.test.js「第一步引用 lastResponse/status 按来源缺失处理」 | — | unit | 上一步响应跨场景泄漏 → engine 应杀 | — |
| TPL-04 | 多模板整串拼接 | issue-112「整串多模板按拼接解析，不再被吞成单个表达式」 | — | issue-112「{{suite.x}} 不再误报 vars.suite 未定义」（与 issue-121 重复锁定） | unit | 多模板退化为单表达式 → issue-112 应杀 | — |
| TPL-05 | 模板内运算符拒绝与未定义告警 | engine.test.js「定义期拒绝模板内运算符（{{vars.a > 0}} 静默解析为空）」；features-dsl.test.js「#66 未定义模板变量：告警一次，声明空串与子路径缺失不告警」 | 同上 | features-dsl「#66 retryUntil 多次尝试只告警一次」 | unit | 静默解析为空/每次重试重复告警 → engine/features-dsl 应杀 | — |
| TPL-06 | 请求体/适配器入参 clone 语义 | issue-36-resolve-clone.test.js（10 项：JSON 序列化一致性/循环引用/BigInt/容器全新/适配器每次尝试独立副本） | issue-36「循环引用抛 TypeError」「非 JSON 类型抛 TypeError」 | issue-36「修改结果不污染输入」；issue-125「retryUntil 键列表只有一份」 | unit | 共享引用（模板结果污染后续步骤）→ issue-36 应杀 | — |

### D. 造数 generatedVars（contract.generatedVars.types，10 类）

| ID | 功能 | 正例证据 | 反例证据 | 边界证据 | CI | 变异建议 | 缺口 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GEN-01 | idcard（GB 11643） | engine.test.js「generatedVars idcard：18 位、出生段、校验位、性别奇偶」；core.test.js「GB11643 底座：标准示例号码」 | engine「idcard：非法参数拒绝」 | engine「跨轮唯一（runId 派生）」 | unit | 校验位算法偏移/确定性改随机 → engine/core 应杀 | — |
| GEN-02 | luhn 卡号 | engine.test.js「luhn：默认 16 位 62 开头且整体合法；length/prefix 可定制」；core.test.js「Luhn 底座：公认测试卡号锚点」 | engine「非法 length/prefix 拒绝」 | length 12-19 边界 | unit | 末位不校验/前缀默认变更 → engine 应杀 | — |
| GEN-03 | phone 手机号 | engine.test.js「phone：11 位 1[3-9] 开头且号段合法；prefix 可定制；跨轮唯一」 | — | 号段池派生 | unit | 号段正则放宽（如 10/12 开头）→ engine 应杀 | — |
| GEN-04 | uscc（GB 32100） | engine.test.js「uscc：18 位 91 开头且校验合法；regionCode 可定制」；core.test.js「USCC 底座：GB 32100 锚点」 | core「非法输入拒绝」 | — | unit | 校验位算法偏移 → core/engine 应杀 | — |
| GEN-05 | timestamp（offset/unit/format/时钟注入） | engine.test.js（5 项：offset 六单位/unit s/format/now+clock 覆盖/互斥拒绝）；features-dsl.test.js「#12 注入时钟：精确断言」「#12 applyGeneratedVar 直接注入 now」 | engine「非法 offset/unit/format 与 format+unit 互斥拒绝」 | 毫秒缺省向后兼容 | unit | offset 单位表错位/format 忽略 offset → engine 应杀 | — |
| GEN-06 | uuid / uuidHex | engine.test.js「uuid：带连字符 UUID v4；uuidHex 保持 32 位无连字符（极性锁定）」；issue-124「UUID v4 格式与唯一性（降级链只保留 getRandomValues）」 | — | 极性锁定（互不混淆） | unit | uuidHex 混入连字符 → engine 应杀 | — |
| GEN-07 | enum（weights 权重抽取） | engine.test.js「enum：值取自候选集、权重 0 永不选中、非字符串候选保留原类型」「取值跨轮变化」「权重分布与权重之比一致（大样本）」 | engine「非法参数拒绝（values 空/weights 形状/全零权重）」 | 大样本分布判别 | unit | 权重忽略/全零时除零 → engine 应杀 | — |
| GEN-08 | md5 / signature 造数 | **已补（第 3 轮静态核实）**：core「A5 md5：公开测试向量 + 与 Node crypto 独立对拍（含中文与长输入）」「A5 signature：按 key 排序拼装 apiSecret，输出大写 MD5（独立对拍）」「A5 generatedVars md5/signature：parts/params 引用 vars，确定性输出，非法参数快速失败」；engine「B8 generatedVars md5/signature 进入引擎 vars：可注入请求、跨轮确定性、缺密钥快速失败」 | A5「非法参数快速失败」；B8「缺密钥使运行快速失败」 | 跨轮确定性（runId 派生）、独立实现对拍 | unit | md5 输出格式变/_signature 拼装口径变/确定性改随机 → A5/B8 应杀 | G3 **代码层闭合**（测试存在并入 CI unit）；**执行待统一结果** |

### E. 作用域与变量优先级

| ID | 功能 | 正例证据 | 反例证据 | 边界证据 | CI | 变异建议 | 缺口 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| VAR-01 | 变量优先级：场景 vars < 配置 vars < 环境 vars < `--vars` | features-cli.test.js「#58 envs[].vars：配置 vars < 环境 vars < --vars」；issue-113-suite-vars-priority.test.js「配置 vars 与选项 vars 覆盖场景 vars」 | issue-113「suite 不再覆盖场景 vars」 | issue-113「suiteVars 兼容别名行为一致」；issue-35-vars-timeout.test.js「--vars 覆盖配置、多组叠加、模板值、可满足 required 变量」 | unit | 优先级链颠倒 → features-cli/issue-113 应杀 | — |
| VAR-02 | suite 命名空间：跨场景共享、run 间隔离、并发快照 | issue-69「CLI run 按清单顺序共享」「不同 run 相互隔离」；features-cli「#69 CLI 多场景共享登录 token」 | — | issue-69「并发 >1 用启动时快照，不读半写入状态」 | unit | 并发直读共享对象 → issue-69 应杀 | — |
| VAR-03 | suite/vars 双通道兼容读取（v16 兼容） | issue-121「{{suite.x}} 不再产生 vars.suite 缺失告警」（2 处锁定） | — | — | unit | 双通道读取断裂 → issue-121 应杀 | — |

### F. 条件 when（contract.when）

| ID | 功能 | 正例证据 | 反例证据 | 边界证据 | CI | 变异建议 | 缺口 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| WHEN-01 | when 对象形式：vars/suite/lastResponse/status 来源与 target:status | engine.test.js「when 支持 lastResponse/status/target:status 读取上一步响应」；issue-69「when/assertions 可直接以 suite 为来源」 | engine.test.js「when 对象形式定义期校验：来源白名单、target 仅 status，禁止 header 与未知断言键」 | engine.test.js「第一步引用 lastResponse/status：条件不成立且不抛错」「when 条件不满足时安全跳过步骤」 | unit | 条件缺失时误判成立/抛错中断 → engine 应杀 | — |
| WHEN-02 | when 非对象形式：模板/布尔放行，裸字符串/数字/数组拒绝 | engine.test.js「when 非对象形式定义期收紧：模板与布尔放行」 | 同上（拒绝分支） | issue-111「when 对象里的 exists 与断言同一口径」 | unit | 放行裸真值（隐式语义）→ engine 应杀 | — |

### G. 引擎执行语义（engine.js）

| ID | 功能 | 正例证据 | 反例证据 | 边界证据 | CI | 变异建议 | 缺口 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ENG-01 | failurePolicy stop / continue | engine.test.js「默认失败停止并保留提取变量」「continue 策略收集全部失败」；browser.test.mjs continue-after-failure 流 | — | browser「进度 3/3 与通过率 66.7% 独立显示」 | unit + browser | continue 误停/stop 误继续 → engine 应杀 | — |
| ENG-02 | retryUntil 成功/耗尽/取消三态 | engine.test.js「retryUntil 成功、耗尽和取消」「maxAttempts 语义 = 最大尝试总次数（含首次）」 | engine「重试总时长超限：报告 TIMEOUT 并保留重试超时消息」 | engine「每次失败重试前发出 onAttempt（序号/总数/间隔/状态/首个失败断言）」 | unit | maxAttempts +1/-1 → engine/issue-59 应杀 | — |
| ENG-03 | retryOn（assertion/error/timeout，默认 [assertion]） | issue-59-retry-on.test.js（21 项，含契约声明与三类重试） | issue-59「maxAttempts 用尽仍报网络错误 → ERROR」「不配置 retryOn 时网络错误仍立即失败」「定义期拒绝非法 retryOn」 | issue-59「取消信号在重试间隔中立即终止」「maxElapsedMs 用尽仍失败 → TIMEOUT，含尝试次数与最后错误」 | unit | retryOn 默认集扩大/缩小 → issue-59 应杀 | — |
| ENG-04 | 指数退避 intervalFactor / maxIntervalMs / 100ms 下限 | issue-8-retry-backoff.test.js（7 项）+ features-dsl「#8 指数退避并封顶」 | issue-8「定义期校验 intervalFactor ≥1 与 maxIntervalMs ≥ intervalMs」 | issue-8「maxIntervalMs 低于 100ms 时仍应用最小间隔下限」「等待按 maxElapsedMs 剩余额度截断」「截断后直接 TIMEOUT 不多跑一次」 | unit | 退避系数颠倒/下限移除 → issue-8 应杀 | — |
| ENG-05 | maxElapsedMs 总时限约束（HTTP/适配器/onAttempt/迟到响应） | issue-59「maxElapsedMs 约束在途 HTTP 请求/适配器/异步 onAttempt」 | issue-59「超时后迟到 HTTP 响应不触发 saveResponseAs」 | issue-59「恰好到 maxElapsedMs 不再发起下一次尝试（>= 边界）」「interval 远大于总时限时按总时限返回」 | unit | 边界 > 改 >=（多跑一次）→ issue-59 应杀 | — |
| ENG-06 | 取消语义（结构化 CANCELLED） | engine.test.js「取消落在两步之间：状态 CANCELLED」「最后一步执行中被取消：CANCELLED 而非 FAILED」「重试等待前/间隔内取消立即生效」；browser.test.mjs 取消流（「用户已取消执行」+CANCELLED 徽章）；browser-comprehensive「取消后无副作用」 | — | engine「retryUntil 轮询不在父 signal 上累积 abort 监听」 | unit + browser | 取消误报 PASSED/延迟生效 → engine/browser 应杀 | — |
| ENG-07 | timeoutMs（步骤级 + request 级 + 结构化 TIMEOUT） | engine.test.js「读体阶段受超时控制：响应头到达后 body 挂起也会 TIMEOUT」「浏览器环境（无 process）下不崩溃」；issue-26b-adapter-timeout.test.js（3 项适配器超时） | issue-45-step-field-validation.test.js（timeoutMs/request.timeoutMs 非法值定义期拒绝、模板运行期解析、非法解析报错） | engine「非法 timeoutMs 定义期拒绝；绕过定义期直接 runStep 仍钳制为默认值」「超过 setTimeout 上限不会立即超时」 | unit | 钳制移除/读体阶段不受控 → engine 应杀 | — |
| ENG-08 | always teardown + 用户取消时不补跑 | features-dsl.test.js「#56 普通步骤失败后跳过中间步骤但执行 teardown，报告保留原始失败」「#56 用户取消时不补跑清理步骤」 | — | browser「#116 失败后仍执行 always，其余步骤 SKIPPED（与 CLI 同口径）」；browser-comprehensive「stop 禁止副作用且 always 清理」 | unit + browser | 取消时补跑清理/always 被跳过 → features-dsl/browser 应杀 | — |
| ENG-09 | SKIP 统计口径 | engine.test.js「SKIP 统计：全跳过 SKIPPED，部分跳过保持 PASSED，SKIP 不计 executed/passedSteps」 | cli.test.js「--all 排除 manual…，SKIP 输出与 fail-on-skip」 | browser「全跳过显示全部跳过、跳过单独统计且不计通过数」 | unit + browser | SKIP 计入通过 → engine 应杀 | — |
| ENG-10 | maxResponseBytes / normalizeByteLimit | engine.test.js「超限返回结构化 responseTooLarge，边界值通过」「超限结构字段只报告已读取字节数」「normalizeByteLimit：0/负/NaN/Infinity/null 均不限，正数向下取整」；node-io.test.js「maxResponseBytes + saveResponseAs：不留下半截文件」 | 同上 | engine「run options 显式 undefined/null 不误覆盖引擎级限制」（node-io 2 项） | unit | 限制静默失效/谎报完整大小 → engine/node-io 应杀 | — |
| ENG-11 | maxUploadBytes | engine.test.js「config/run options 透传给 io.createUploadBody」；node-io.test.js「超限返回结构化错误，边界值与调用级覆盖生效」「超限先在 stat 阶段拒绝」 | node-io「路径穿越与空路径拒绝」「工作区内不存在的文件报错」 | node-io「junction/符号链接越界：词法在界内实路径出界均拒绝」 | unit | 边界 ±1/stat 跳过 → node-io 应杀 | — |
| ENG-12 | saveResponseAs（含流式） | engine.test.js（3 项：模板路径/saveResponseStream 流式/仅流式实现零字节）；node-io.test.js（saveResponse 递归建目录、流式一致、失败删半截、跟随符号链接、挂起超时清理） | node-io「saveResponse：路径穿越拒绝，工作区外不可写」 | issue-45（saveResponseAs 空串/模板校验）；issue-59「maxElapsedMs 超时后迟到响应不触发保存」 | unit | 越界写入/半截文件残留 → node-io 应杀 | — |
| ENG-13 | fileUpload（FormData） | engine.test.js（3 项：io 构造/omitContentType/Readable 补 duplex）；node-io.test.js（对象/字符串定义、duplex、超限） | cli.test.js「--json：上传超限保留结构化 uploadTooLarge 且退出码非零」 | — | unit | 超限静默上传 → cli/node-io 应杀 | — |
| ENG-14 | 环境无关性与双端同源 | engine.test.js「浏览器环境（无 process 全局）下 runScenario/createRuntime 不崩溃」「缺少 envVars 的错误消息不泄漏环境变量名」「无 fetch 实现时 createEngine 快速失败」；parity.test.js「generatedVars 双端同源：浏览器 runtime 复用 core.applyGeneratedVar」 | — | parity「ui-utils 在无 DOM 的 Node 环境可用」 | unit | 双端分叉（浏览器自维护分支）→ parity 应杀 | — |
| ENG-15 | 适配器协议与分发 | adapter.test.js（17 项：校验/注册/钩子/matches 自动分发/dispose/clear）；issue-115「无适配器命中且无 HTTP 字段报错，不再静默 GET 根路径」 | adapter「执行失败：onError 收原始异常/结构化 TIMEOUT/code 经 cause 透出/onError 抛错不掩盖」；issue-26a「headers 为 null 拒绝」 | issue-36「适配器 execute 每次尝试独立副本」；issue-26d「B1 拼错 DSL 键拒绝，适配器私有键放行」；issue-45「适配器字段校验与 HTTP 步骤一致」 | unit | matches 误认领/私有键误拒 → adapter/issue 系列应杀 | — |

### H. HTTP 与 IO

| ID | 功能 | 正例证据 | 反例证据 | 边界证据 | CI | 变异建议 | 缺口 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| HTTP-01 | requestKeys 白名单 | issue-125-request-keys.test.js「拼写错误定义期报错并给近似建议」「requestKeys 进入 contract/capabilities/d.ts」；issue-26d「B3 request/params 非对象与双写冲突拒绝」 | 同上 | issue-26d「适配器私有配置键仍放行」 | unit | 静默忽略拼错键（历史假象）→ issue-125 应杀 | — |
| HTTP-02 | URL 构建：fragment/协议相对/畸形编码 | issue-42-url-fragment.test.js（10 项）+ issue-44-safe-decode.test.js（10 项）+ issue-26c「B4 joinUrl 不破坏协议相对 URL」 | issue-44「畸形编码回退原串，不再使步骤 ERROR」 | issue-121「协议相对 URL 按 baseUrl 协议补全」；issue-42「fragment 内含 ?/& 仍按第一个 # 拆分」 | unit | 参数拼进 fragment/URIError 中断 → issue-42/44 应杀 | — |
| HTTP-03 | params（含数组重复 key、空值） | issue-26c「B5 数组 params 展开为重复 key」；issue-44「step.params 追加在 fragment 之前」 | issue-26c「空数组/空值不产生参数」 | issue-44「无 globals 时不解析已有 query：畸形 % 原样发出」 | unit | 空值产出空参数/数组改逗号拼接 → issue-26c 应杀 | — |
| HTTP-04 | globals（header/query/cookie 注入、模板值、步骤优先、绝对 URL 不注入） | engine.test.js「全局参数注入 header/query/cookie」「全局参数值支持 vars 模板且同名参数步骤优先」「cookie 全局参数追加到已有 Cookie 头」；core.test.js「mergeGlobals 按 type:name 去重且后者覆盖」 | engine「绝对 URL 不注入全局参数与 authorization」；cli.test.js「SCENARIO_GLOBALS 注入/非法 JSON 报错/缺必需字段报错」 | issue-42「globals query 注入到 fragment 之前」「显式 useEnvironmentAuthorization 时注入」；issue-26c「B5 全局 query 数组值重复 key」 | unit | 绝对 URL 误注入/同名覆盖顺序颠倒 → engine/issue-42 应杀 | — |
| HTTP-05 | 响应体 charset 解码（GBK） | engine.test.js「响应体按 content-type charset 解码（GBK）」 | — | — | unit | 忽略 charset（按 UTF-8 硬解）→ engine 应杀 | — |
| HTTP-06 | credentials / redirect 透传 | engine.test.js「请求透传浏览器凭据和重定向策略」 | — | — | unit | 透传字段丢弃 → engine 应杀 | — |
| HTTP-07 | cookie-jar（Set-Cookie 携带/覆盖/清除，跨站防护） | features-dsl.test.js「#65 Set-Cookie 自动携带、显式同名覆盖、Max-Age=0 清除」 | issue-119-proxy-cookie-hardening.test.js「Cookie Jar 拒绝跨站 Domain 与公共后缀」 | — | unit | 跨站 Domain 放行（安全）→ issue-119 应杀 | — |
| HTTP-08 | nodePlugins 插件加载 | issue-34-concurrency.test.js「插件钩子拒绝（含假值）时并发与串行退出码/输出一致」「并发中钩子拒绝后在途完成、不再调度、非零退出」 | **已补（第 3 轮静态核实）**：comprehensive-cli「C12 --allow-external-plugins：默认拒绝目录外插件（零副作用+可定位报错）」「C12 flag 放行：告警+钩子实际生效」「目录内插件无需 flag 正常工作」「钩子抛错→非零退出+错误可定位」 | 钩子生效面（放行后副作用可观测） | unit | 路径校验绕过/flag 语义反转 → C12 应杀 | G4 **代码层闭合**；**执行待统一结果** |
| HTTP-09 | authorization（SCENARIO_AUTH/--authorization 弃用/环境注入/旧配置兜底） | cli.test.js「--base-url 覆盖且 SCENARIO_AUTH 注入」「SCENARIO_AUTH 与 --authorization 冲突时环境变量优先并警告」「--authorization 单独使用时输出弃用警告」；engine.test.js「旧 authorization 配置兜底注入且全局 header 优先」 | — | issue-42「绝对 URL 默认不注入 authorization，显式 useEnvironmentAuthorization 注入」 | unit | 环境变量优先级颠倒 → cli 应杀 | — |

### I. CLI 命令与选项

| ID | 功能 | 正例证据 | 反例证据 | 边界证据 | CI | 变异建议 | 缺口 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CLI-01 | run：执行、Overall 统计、结论行三态 | cli.test.js「CLI 从公共 JS 配置执行场景」「Overall 统计按计划步骤数计算」「结束输出结论行：失败/全部跳过/完成三态口径可判别」 | cli「CLI 拒绝旧 window 全局配置与场景格式」「配置全部为 manual 时 --all 报明确错误」 | cli「重试轮询输出 [RETRY] 进度行」 | unit | 退出码恒 0/统计口径漂移 → cli 应杀 | — |
| CLI-02 | 场景选择 --all / --scenario（逗号多选、manual 显式）| cli.test.js「--all 排除 manual，显式 --scenario 可执行」「--scenario 逗号分隔多选：配置顺序子集」「--scenario 未命中列出候选」 | cli「--scenario 未命中即报错」 | cli「--fail-on-skip 存在 SKIP 时退出码 1」（features-cli #90 邻近锁定） | unit | manual 被默认放行 → cli 应杀 | — |
| CLI-03 | --env / --base-url / 回退链 | cli.test.js「--env 未知环境报错退出，不静默回退」「环境 baseUrl 纯空白回退顶层」「--base-url 临时覆盖」 | 同上 | issue-114「配置没有 envs 时显式 --env 报错」；serve.test.js「--env 未知环境报错退出」（serve 同口径） | unit | 静默回退 envs[0] → cli/serve 应杀 | — |
| CLI-04 | --vars / --timeout | issue-35-vars-timeout.test.js（4 项） | issue-35「非法格式与非法值给出示例错误」 | issue-35「短超时使慢响应返回 TIMEOUT」 | unit | 覆盖顺序颠倒 → issue-35 应杀 | — |
| CLI-05 | --tag（OR/AND、manual 不放行） | features-cli.test.js「#68 重复参数 OR、单参数内逗号 AND、manual 仍需显式选择」 | 同上 | issue-122「JUnit 用数据行区分同名场景」 | unit | OR/AND 语义颠倒 → features-cli 应杀 | — |
| CLI-06 | --bail | features-cli.test.js「#71 首个失败场景后不再执行后续场景，JSON 标注 notRun」 | — | issue-122「记录 --bail 未执行场景」（JUnit） | unit | bail 后继续调度 → features-cli 应杀 | — |
| CLI-07 | --data（CSV/JSONL 数据驱动） | features-cli.test.js「#70 CSV/JSONL 逐行注入变量并聚合结果」 | issue-122-cli-data.test.js「CSV 未闭合引号/中段引号/闭合后非法字符明确报错」 | issue-122「并发时 shape 明细走场景私有缓冲，不插到其他场景块」 | unit | 并发共享缓冲串块 → issue-122 应杀 | — |
| CLI-08 | --concurrency | issue-34-concurrency.test.js（5 项：契约/串行一致/正整数校验/插件拒绝一致/在途收尾） | issue-34「必须为正整数」「钩子拒绝后非零退出且无最终 JSON」 | issue-34「报告内容/顺序/退出码与串行一致且耗时缩短」 | unit | 并发丢报告/退出码漂移 → issue-34 应杀 | — |
| CLI-09 | --json（stdout 纯净） | cli.test.js「--json：stdout 纯净可解析，单场景 report、多场景聚合，进度走 stderr」 | cli「--config 缺值拒绝 -h/--help 占位」 | capabilities/doctor --json 同口径（各文件内锁定） | unit | JSON 混入进度行 → cli 应杀 | — |
| CLI-10 | --cookie-jar | features-dsl.test.js「#65」（见 HTTP-07） | — | — | unit | 见 HTTP-07 | — |
| CLI-11 | SCENARIO_* 环境变量与 SCENARIO_NO_BODY_PRINT | cli.test.js「SCENARIO_GLOBALS 注入/非法报错/缺字段报错」「响应体/路径/断言输出防 CI 命令与 ANSI 注入，SCENARIO_NO_BODY_PRINT 关闭输出」 | 同上 | — | unit | ANSI 注入放行（CI 日志攻击面）→ cli 应杀 | — |
| CLI-12 | 参数解析纠错与输出有界 | cli.test.js「拒绝未知参数、缺失参数值和冲突选择」「命令放错位置给出纠正」「未知参数给拼写建议」「失败输出有界：20k 原值不整行打印」 | 同上 | cli「--help 选项清单从 contract 投射：无孤儿选项行」 | unit | 未知参数静默当场景名 → cli 应杀 | — |
| CLI-13 | serve（同源代理/HTML 注入/安全/端口） | serve.test.js（13 项）；serve-server.test.js（3 项）；serve-server-security.test.js（9 项：Host 白名单/DNS rebinding 403/hop-by-hop 双向剥离/HTML 注入代理标记/502 降级/safeFile 越界 403）；**已补（第 3 轮静态核实）**：comprehensive-cli「C11 serve × 项目登记：缺省复用登记端口、显式 --port 更新登记、占用时明确报错退出 1」「C11 projects ensure --reassign：占用后顺延新端口+更新登记，缺省保留登记并如实报告占用」「C13 serve --open 经 PATH 桩验证（仅 Linux 执行，其余平台显式 SKIP——runner 对 SKIP 单列非零退出，不冒充通过）」 | issue-119「拒绝跨站来源的代理请求且不触达上游」「客户端中断立即销毁上游」；serve「端口占用时友好退出」；C11 占用报错 | issue-72-proxy-timeout.test.js（3 项）；issue-119「https 上游默认校验证书，insecure 才放宽」；serve「https 端到端（需 openssl）」 | unit（openssl 用例环境受限自跳过；C13 Linux-only） | hop-by-hop 剥离遗漏（头走私）/Origin 校验绕过 → serve-server-security 应杀 | G5（serve×登记）与 G7（--open）**代码层闭合**；serve-server 本体仍不在变异范围；**执行待统一结果** |
| CLI-14 | init（模板/旧副本清理/--clean/--e2e） | init.test.js（8 项：3 文件布局无 .scenario-test/独立存储前缀/嵌套目录/--no-input/旧副本检测 + --clean/--e2e/越界与未知参数拒绝）；issue-118-init-dir.test.js（3 项：目录归一化拒绝/junction 越界拒绝/正常相对目录可初始化） | — | init「默认不覆盖项目文件」；issue-120-loader-install.test.js（4 项：死循环超时/install 按 release.json SHA-256 校验/shebang/内联校验脚本可解析） | unit | 远程校验绕过（直接执行下载文件）→ issue-120 应杀 | — |
| CLI-15 | doctor（全部检查项） | doctor.test.js（26 项：健康 PASS/版本锁/UMD 版本/SHA256 WARN/capabilities schema/场景 url 越界/config 拼写/baseUrl 合法性/manual INFO/satisfiesNodeEngine） | doctor「未知操作符 FAIL 且不中断汇总」「多文件错误汇总」「--json 配置缺失退出 1 其余继续」 | doctor「绝对场景路径 WARN 不 FAIL（与 run 语义一致）」；issue-107-manual-write + issue-107-weak-assertions（6 项 AI 规则检查） | unit | FAIL 误报 INFO/WARN → doctor 应杀 | — |
| CLI-16 | import（HAR/curl） | issue-89-import.test.js「HAR 导入：过滤静态资源/预检、敏感头脱敏、二进制降级，草稿可直接 run」「curl 导入：解析续行/Header/Body，敏感值只落 vars 占位」「--host/--max-entries 支持，拒绝冲突/空输入」 | issue-89「HAR/curl 解析器：无效输入报错，URL 敏感 query 与二进制 body 不落明文」 | issue-117-import-injection.test.js（3 项：U+2028/2029 头过滤/非法 method 过滤/URL 百分号编码） | unit | 行终止符注入草稿 → issue-117 应杀 | — |
| CLI-17 | projects（用户级登记） | project-registry.test.js（8 项：项目发现向上/自定义目录/null/ensure 端口复用/reassign 顺延/set-port/remove 持久化/SCENARIO_TEST_HOME 覆盖/CLI JSON 可解析）；comprehensive-cli「C10 projects：ensure 分配端口并复用、set-port/list/remove 幂等、登记损坏明确报错」（新增，存在未执行） | — | project-registry「显式端口写入登记」 | unit | 登记端口漂移 → project-registry 应杀；M39/M40 自报 killed | — |
| CLI-18 | capabilities（文本/JSON/构建产物一致） | capabilities.test.js（4 项：结构直接来自 contract 且序列化稳定/文本清单/--json stdout 纯净且与 build 产物一致/文本面向人类） | doctor「capabilities.json 解析失败/schema 不匹配/版本不一致分别 FAIL」「缺失 WARN」 | — | unit | 投射与 contract 漂移 → capabilities/doctor 应杀 | — |

### J. 报告与证据（脱敏 / 结构 diff / 离线报告 / JUnit）

| ID | 功能 | 正例证据 | 反例证据 | 边界证据 | CI | 变异建议 | 缺口 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RPT-01 | Markdown 报告与转义（换行/反引号/围栏自适应） | report.test.js（20 项） | report「明细行极性：失败透出、通过不透出」 | report「代码围栏随内容自适应」「元数据同时含字面 \n 与真实换行」 | unit | 转义遗漏（Markdown 注入/拆行）→ report 应杀 | — |
| RPT-02 | 失败结构 diff（failure-diff） | failure-diff.test.js（21 项：短值单行/长值分块/行级对齐/hunk 合并/结构 pretty） | failure-diff「两侧行数超护栏退回分块（防 O(n·m)）」「循环引用回落 String() 不抛错」 | failure-diff「末尾不可见字符差异可见（\r）」「240 字符限宽」「U+2028/2029 折叠」 | unit | diff 恒空/超长失控 → failure-diff 应杀 | — |
| RPT-03 | 字段差异证据（structural-diff，issue-131 系列） | issue-131-134.test.js「#131 深嵌套叶子/类型/缺失字段差异与 HTML 安全」「大数组、超长值和深层结构的证据有界」「length 组合保留原始比较证据」 | issue-131「oneOf 标注候选；notEquals 相等失败；多操作符不伪造差异」 | issue-131「长字符串证据不复制敏感前缀，超长键保持预算」；browser/browser-comprehensive 工作台呈现（.structural-diff） | unit + browser | 伪造差异/无界证据 → issue-131 应杀 | — |
| RPT-04 | 脱敏（redactSecrets 全链路） | features-dsl.test.js「#90 redactSecrets：变量名命中脱敏，非敏感值保持原样」；features-cli.test.js「#90 敏感变量：失败 diff、摘要与 --json 均不出现原始密钥」；**已补（第 3 轮静态核实）**：coverage-fixes 6 个敏感验收用例——首步网络错误重试日志、动态提取值作请求体、字面请求值（stdout/stderr/JUnit/HTML 全报告，服务端收到原值）、vars/generatedVars 特殊字符（4 层 JSON 转义+XML 转义全查）、引擎兼容开关（默认调用 1 参不变） | issue-89「HAR 敏感头脱敏」「URL 敏感 query 与二进制 body 不落明文」 | issue-133「CLI 成功+失败同时导出 JSON/JUnit/HTML，失败退出码及脱敏保持」；security.test.js + security-fixes.test.js「公共库和产物不包含业务环境与已知密钥」；字面用例含「非敏感对照 visible-control 应保留」（防过度脱敏） | unit + browser-comprehensive（工作台 runtime.js/ui-adhoc.js 同步接入 outputSecrets/safeOutput） | 脱敏名单遗漏路径（HTML/JUnit/回显）→ coverage-fixes/issue-133 应杀 | G10 **修复落地**（src/utils/output-secrets.js 收集字面+转义变体；cli.js/engine.js/browser 三端接入；engine.js `_includeAttemptContext` 为显式内部开关，默认调用签名不变）；**执行待统一结果** |
| RPT-05 | 离线 HTML 报告 | issue-133「离线报告区分跳过、取消、未执行并转义响应值」 | issue-131「HTML 安全（深嵌套差异转义）」 | — | unit | 状态误标 PASSED/未转义 → issue-133 应杀 | — |
| RPT-06 | JUnit 报告 | features-cli.test.js「#57 失败/跳过映射为 failure/skipped，XML 完整转义」；**已补（第 3 轮静态核实）**：coverage-fixes「bail 多行数据 JUnit 包含所有未执行场景及全局计数」（tests="4" failures="1" skipped="3" + 逐项 id 断言），且 notRun 经 redactSecrets 脱敏后写入（src/cli.js 修复） | — | issue-122「JUnit 用数据行区分同名场景，并记录 --bail 未执行场景」 | unit | XML 注入/状态映射颠倒/notRun 漏项 → features-cli/coverage-fixes 应杀 | G9 **修复落地**（writeJUnitReport 传入脱敏后的 notRun；既有 C7 错误现状锁定已被新用例取代）；**执行待统一结果** |

### K. 工作台（浏览器）

| ID | 功能 | 正例证据 | 反例证据 | 边界证据 | CI | 变异建议 | 缺口 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| WB-01 | 执行调度与引擎同口径（run/单步/cancel/timeout/重试） | browser.test.mjs（运行、单步模式超时后 stepRuntime 清空重跑、取消文案结构化映射）；browser-comprehensive.test.mjs「正反例：retry 成功和耗尽精确请求次数（3 次/2 次）」 | browser-comprehensive「反例：超时和取消原因及取消后无副作用」 | browser-comprehensive「边界：新运行变量隔离与条件 SKIP」 | browser job（browser.test.mjs + browser-comprehensive，2026-11-06 已接线）；本轮未执行 | 调度分叉（工作台与 engine.runScenario 口径漂移）→ 两端到端应杀 | G1 已缓解：接线完成，执行结果待 CI/T05 |
| WB-02 | 场景列表/目录树/搜索/置顶 | scenario-tree.test.js（10 项逻辑 + 工作台渲染折叠保留）；browser.test.mjs（6 场景清单加载） | scenario-tree「搜索过滤只保留命中分支」 | scenario-tree「空清单返回空树」「Windows 分隔符归一化」 | unit（树逻辑）+ browser（渲染） | 树折叠状态丢失/过滤越界 → scenario-tree 应杀 | — |
| WB-03 | 配置面板/凭据掩码/保存恢复/显隐切换 | browser.test.mjs（token 变量 type=password、点击切换显隐、保存「已保存并生效」、清除「已恢复配置值」） | browser「快捷键不得从配置弹窗执行场景」（见 WB-07） | browser「非凭据变量保持明文输入」 | browser | 掩码逻辑反转 → browser 应杀 | — |
| WB-04 | 复制：报告 MD/JSON、步骤、cURL 预览 | browser.test.mjs（复制三态反馈、execCommand 回退、双失败反馈无 pageerror、大响应体复制完整>64K 而展示截断）；browser-comprehensive 亦覆盖 adhoc 草稿复制 | browser「Clipboard 同步抛错走 execCommand 回退」「API 与回退均失败显示失败反馈」 | issue-42「cURL 预览 globals query 注入到 fragment 之前」；issue-44「cURL 畸形 % 不抛 URIError」（工作台渲染回归） | browser | 复制内容截断/回退链断裂 → browser 应杀 | — |
| WB-05 | adhoc 临时请求与步骤草稿 | browser.test.mjs（执行成功→转草稿→状态码/方法/头模板化脱敏→可解析可注册）；issue-91-adhoc-step-draft.test.js（3 项） | browser-comprehensive「反例：临时请求无效 JSON 不发请求」（adhocError 提示 + hits 不变） | issue-91「GET/HEAD 省略不可运行请求体，空 name 占位」「没有实际响应状态码时拒绝生成」 | browser + unit + browser-comprehensive（G1 已接线，未执行） | 草稿注入明文密钥（敏感头脱敏）→ browser/issue-91 应杀 | — |
| WB-06 | 主题/样式/storageKeys 自定义 | browser.test.mjs（theme 切换 class+CSS 变量）；ui-style.test.mjs（悬停过渡/空态虚线/毛玻璃 6px/滚动条 8px/reduced-motion 无动画/暗转亮配色）；browser.test.mjs storageKeys 回归（自定义 LocalStorage 键读写） | ui-style「皓白输入框不应残留暗色过渡」 | browser「storageKeys 不得被 defineConfig 拒绝且真正用于读写」 | browser | 不适用业务变异——纯视觉展示能力；行为面（配置读写）由 browser.test.mjs storageKeys 断言锁定 | — |
| WB-07 | 快捷键隔离（配置弹窗/adhoc 弹窗不执行背景场景） | browser.test.mjs（两组弹窗 × 4 快捷键：不执行、不清结果、不移焦点） | 同上（负向即断言不变式） | browser「Control+k 从另一输入框进入搜索后快捷键仍可用」 | browser | 焦点泄漏/背景误执行 → browser 应杀 | — |
| WB-08 | `?scenario=` 白名单（防未列入清单脚本执行） | browser.test.mjs（evil-unlisted-test.js 注入被拒，__PWNED__ 不触发；清单内场景 URL 参数正常加载） | 同上 | — | browser | 白名单绕过（任意 JS 执行）→ browser 应杀 | — |
| WB-09 | 工作台步骤筛选/搜索空态/定位失败步骤/运行时变量面板 | browser.test.mjs（筛选计数与 aria-pressed、空态一键清除、失败诊断定位展开高亮、运行时变量面板含配置+保留变量、无 extract 无变更徽标） | browser「失败筛选只显示失败步骤」「无匹配搜索隐藏全部步骤」 | browser「跳过步骤也提供复制按钮」 | browser | 筛选计数漂移/定位索引错位 → browser 应杀 | — |
| WB-10 | 工作台端到端正反例综合（T03 新增） | browser-comprehensive.test.mjs **17 项检查**（12 项第 2 轮已有：all 变量传递、环境 B 切换+单步、retry 3/2 精确计数、报告 JSON 状态一致、临时请求及草稿敏感头遮蔽、搜索无匹配、stop 清理、超时取消、变量隔离+条件 SKIP、无效配置拒绝；**第 3 轮新增 4 项敏感回显**：敏感请求回显诊断与导出隐藏但服务收到原值、临时请求特殊字符服务收原值/展示隐藏、特殊字符敏感回显工作台诊断与报告、空场景清单）+ **dist 模式同套检查**（`test:browser-comprehensive:dist`），证据落 tests/fixtures/browser-comprehensive/artifacts/（已 gitignore） | 「反例：stop 禁止副作用且 always 清理」「临时请求无效 JSON 不发请求」「超时和取消原因及取消后无副作用」「无效配置拒绝初始化且不发请求」 | 「边界：新运行变量隔离与条件 SKIP」「空场景清单不会发请求」 | **已接入 CI**：browser job = build → src 17 → dist 17 → ui-style；本轮未执行 | 与 WB-01 共用调度分叉变异（本轮 50 变异体不含浏览器端） | G1 已闭合于代码层（src/dist 双验收接 CI）；**未验证**（执行结果待统一结果/CI） |

### L. 消费端（src → dist → 发布版 Skill）

| ID | 功能 | 正例证据 | 反例证据 | 边界证据 | CI | 变异建议 | 缺口 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CONS-01 | dist 构建发布/回滚/孤儿清理 | build.test.js（8 项：pid 死活判定/rename EPERM 重试与 cpSync 回退/孤儿 staging·swap·trash 清理/发布失败回滚还原） | build「存活 pid（含复用）不误删」「发布失败抛错并还原」 | build「backup 死 pid 且 dist 缺失时还原 vs 活跃构建推迟」 | unit | 误删活跃产物/回滚不还原 → build 应杀 | — |
| CONS-02 | dist 新鲜度闸门（Tag 即分发产物） | ci.yml unit job：`git diff --exit-code -- dist/`；issue-124「CI 覆盖 dist 新鲜度、d.ts 自编译与 Node 22/24 矩阵」 | stale dist 直接挡在 CI | — | 是（ci.yml） | 不适用业务变异——CI 断言本身即闸门 | — |
| CONS-03 | d.ts 投影与可编译 | dts.test.js（10 项：contract 投影一致/公共 API 覆盖/无重复成员/无幻影符号/tsc --noEmit/形状与运行时一致）+ CI types job 独立 tsc | dts「重复成员会让 tsc 报 TS2300」 | dts「Assertion/WhenDefinition 必须覆盖 contract 全部操作符（防手写漏新增）」 | 是（types job） | 投影漂移 → dts/contract 应杀 | — |
| CONS-04 | capabilities.json / init 模板 / AI Prompt 单一来源投影 | contract.test.js（8 项：版本递增/导出名单一致/操作符说明/when·extract·保留变量·generatedVars/config·scenario·cli 投影/engines 与 package.json 一致/init 模板无手抄名单/接入文档用 Skill 安装脚本） | contract「每个操作符含说明；数值操作符标注有限 number 约束」 | capabilities.test.js「--json 与 build 产物一致」 | unit | 第二份手抄名单漂移 → contract/dts 应杀 | — |
| CONS-05 | 版本一致性 | version.test.js「生成的运行时版本与 package.json 一致」；doctor 版本锁检查（见 CLI-15） | — | — | unit | 版本漂移 → version/doctor 应杀 | — |
| CONS-06 | 发布版 Skill：离线初始化/项目发现/版本差异 | skill-runtime.test.js「Skill 发布版离线初始化，项目与 Skill 版本不同时仍使用项目 CLI」；skill-detect.test.js（6 项：工作树 .git 识别/嵌套发现/不完整列出缺失/子项目优先/自定义目录/越界拒绝） | skill-detect「拒绝越界目标目录与未知参数」 | skill-detect「不完整：列出缺失文件，不误判安装完成」 | unit | 越界探测/误用父项目运行时 → skill-detect 应杀 | — |
| CONS-07 | Skill e2e 接入-执行冒烟（真实发布链路） | tests/skill-e2e/（README/docker/java-springboot/python） | — | — | **否：仅 192.168.1.214**（AGENTS.md 约定，本机无 Docker） | 不适用业务变异——环境受限 | **已执行（远程 214，2026-11-14）**：`run-python-test.sh`（python Flask fixture）4/4 PASS、`run-java-test.sh`（java-springboot fixture）9/9 步 PASS，pi 模型 `new-api/deepseek-v4.1-flash`（214 仅认证 new-api，agent 脚本需 `MODEL` env 前缀——已改为 `MODEL`/`PORT` env 可覆盖）；java 冒烟用 `PORT=18090` 避开 214 Jenkins 占用 18080。仍不在 CI——证据为手动远程执行 |
| CONS-08 | core 断言/resolve 语义对拍（浏览器工作台 vs core） | parity.test.js（11 项：极性全锁定/深比较/each/extract 契约/headers 口径/generatedVars 双端同源/ui-utils 无 DOM） | parity「includes/oneOf/exists 假绿回归」专项 | parity「oneOf 非数组必须失败」 | unit | 双端语义分叉 → parity 应杀 | — |
| CONS-09 | 场景设计 A/B 与评分器 | score-design-eval.test.js（4 项：理想产出高分/改 ID 扣卫生分/幂等前后 total 相等算后置验证/只断言 200 得 0 覆盖分）；tests/fixtures/scenario-design/（A/B 脚本与 summarize） | score-design-eval「弱产出显著低分」 | — | 评分器 unit 已接 CI；A/B **已执行（远程 214，2026-11-14）** | 评分器适用业务变异（权重偏移）→ score-design-eval 应杀；A/B 脚本不适用（实验脚本） | A/B 远程已执行：current（v0.15.0+，`5a2fb81`）6 轮结构分 min 69/中位 93/max 100（分布形态与历史 baseline 一致，波动源于模型不收敛）；**变异硬门槛 6 产物×M1-M9=54/54 杀死**；R5 为 `allowedPending` 预期缺口 |
| CONS-10 | 工程约束：行尾/测试分层/CI 触发 | eol.test.js（4 项：.gitattributes 策略/解析/判定极性/仓库无幻影）；engineering.test.js（#48 分层显式、#47 CI 触发与矩阵）；ci.yml 行尾审计步骤 | eol「判定极性」锁定误报/漏报 | — | 是 | eol 极性翻转 → eol 应杀 | — |

### 3.13 本轮新增测试 → 矩阵行证据索引（第 3 轮快照，2026-11-06 ~13:00）

索引内新证据状态一律为：**存在（QA 已静态核实代码与用例定义；执行待统一验证结果）**。CI 纳入=对应 job。

| 新增测试（组/文件） | 用例数 | 对应矩阵行 | 备注 |
| --- | --- | --- | --- |
| comprehensive-core A1 组 | 7 | OP-02/05/09/10/11/12/13 | 边界取等、不做隐式转换、多操作符 AND、字符串边界、深比较、exists 判定边界 |
| comprehensive-core A2 组 | 5 | OP-11、RPT-03 | length 组合的 diff 证据必须用原始值（变异 M04/M05 锁定） |
| comprehensive-core A3 组 | 3 | OP-06 | integer/required/items 边界（M06） |
| comprehensive-core A4 组 | 7 | EX-01/02/06/07/08/09/10 | required/default/来源优先级/通配/suite/保留变量/空响应体（M07–M12） |
| comprehensive-core **A5 组（第 3 轮新增）** | 3 | GEN-08 | md5 公开向量+crypto 对拍（中文/长输入）、signature 排序拼装对拍、generatedVars md5/signature 确定性+非法参数拒绝（G3） |
| comprehensive-engine B1 组 | 6 | ENG-02/03 | retryOn 成员判定/缺省/耗尽/终态（M13/M14/M41） |
| comprehensive-engine B2 组 | 2 | ENG-06/07 | timeoutMs 结构化 TIMEOUT、取消+unexecuted（M16/M17/M19） |
| comprehensive-engine B3 组 | 2 | ENG-01/08 | always teardown、continue 收集全部失败（M18） |
| comprehensive-engine B4 组 | 2 | WHEN-01 | when 假→SKIP 计数、引用上一步响应（M20） |
| comprehensive-engine B5 组 | 5 | ENG-10/11/12/13 | 上传/下载/大小上限/路径越界（M21/M22/M23/M28） |
| comprehensive-engine B6 组 | 4 | HTTP-07 | cookie jar 携带/覆盖/清除/跨站/Secure（M24–M27） |
| comprehensive-engine B7 组 | 4 | GEN-01/02/03/04/05、TPL-01 | 校验位独立实现复算（交叉验证）、注入时钟、模板变量（M29/M30） |
| comprehensive-engine **B8（第 3 轮新增）** | 1 | GEN-08 | md5/signature 进引擎 vars：注入请求、跨轮确定性、缺密钥快速失败（G3 引擎面） |
| comprehensive-cli C1 组 | 3 | CLI-01/09、OP-15 | 退出码、--json stdout 纯净、默认 2xx 语义边界（M31/M32） |
| comprehensive-cli C2–C4 | 3 | EX-08/VAR-02、CLI-05/06 | suite 跨场景、tag AND/OR、bail notRun（M33–M35） |
| comprehensive-cli C5/C6 | 4 | CLI-08/07 | 并发=服务端在途峰值证据（不依赖墙钟）、data 行隔离与格式报错（M37） |
| comprehensive-cli C7 组 | 3 | RPT-04/05/06、CLI-11 | JUnit/HTML 转义与状态区分、vars 敏感值脱敏、SCENARIO_NO_BODY_PRINT（M36） |
| comprehensive-cli C8–C10 | 5 | CLI-02/16/17 | fail-on-skip、import HAR/curl、projects 登记（M38–M40） |
| comprehensive-cli **C11–C13（第 3 轮新增）** | 5 | CLI-13、HTTP-08 | serve×项目登记（缺省复用/--port/占用报错）、ensure --reassign、allow-external-plugins ×2、serve --open PATH 桩（Linux-only）（G4/G5/G7） |
| browser-comprehensive **17 检查** | 17 | WB-01/04/05/10 + ENG-01/06/08 工作台面 | 第 2 轮 12 项 + 第 3 轮新增 4 项敏感回显（诊断/导出隐藏、服务收原值、特殊字符、草稿遮蔽核对）；src + dist 双模式同套执行 |
| coverage-fixes.test.js | 8 | RPT-06（G9）、RPT-04（G10 ×6）、CLI-13（G5 serve --reassign） | 修复验收用例（第 2 轮 2 个红用例的修复已入工作树，扩展为 8 项：含非敏感对照保留与兼容开关验证） |
| 合计 | **82** | — | 74（研发1：core 25 + engine 26 + cli 23；README §1/§2/合计已改 74，G11 修正已核实）+ 8（研发2） |

## 4. 汇总

### 4.1 覆盖统计（按行计数，静态审计口径）

- 矩阵行总数：**112 行**（脚本枚举本文件表格 ID 行，无重复 ID）。分区：A 15 + B 10 + C 6 + D 8 + E 3 + F 2 + G 15 + H 9 + I 18 + J 6 + K 10 + L 10 = 112。第 1 轮误写"76 行"为人工汇总错误，作废。
- **存在 × CI 纳入**：**111 行**有既有测试且纳入 CI job（第 3 轮：原 109 + GEN-08、HTTP-08 补测试后转入）。其中带限定注记：EX-04 反例偏薄、CONS-09 仅评分器半边在 CI、WB-01/05/10 依赖 browser-comprehensive src+dist 双模式（已接线未执行）。
- **待验证（无既有测试）**：**0 行**（第 2 轮的 GEN-08（G3）、HTTP-08（G4）已补测试，静态核实存在，执行待统一结果）。
- **未验证（远程/环境受限）**：无残留——CONS-07、CONS-09 均已于 2026-11-14 在 214 执行通过（见各行证据）。**已执行 ≠ 宣称所有功能/所有组合 100%**。
- **不适用/变异豁免**：WB-06（视觉展示）、CONS-02（CI 闸门即证据）、文档行（§4.3；豁免 ≠ 验收通过）。
- **已执行维度**：QA 本轮（第 3 轮终验审查）仍为 **0 行独立执行**（约束：不与统一验证进程并行跑测试/构建）。研发自报（待统一结果核验）：comprehensive* 74 用例 + coverage-fixes 8 + runner 自测 12/12 + 变异 50 个（49 killed + 1 equivalent + Windows 上 M50 excluded）+ browser src 17/17。一切执行结论以统一验证进程与 CI 为准。
- 变异状态：50/50 定义见 §4.5（find-once 静态校验 QA 全过）；第 2 轮 41 变异体 artifact 为历史快照，已被 50 变异体清单取代；各行「变异建议」列仍为完整选点输入，50 个是有界选点而非穷举。

### 4.2 缺口清单（优先级排序）

| 编号 | 优先级 | 缺口 | 当前状态（快照 2026-11-06 ~13:00，T05 终验审查） | 归属 |
| --- | --- | --- | --- | --- |
| G1 | P0 → **闭合于代码层** | browser-comprehensive 无 script/CI 入口 | MausBot 接线 + QA 第 3 轮只读核实：`test:browser-comprehensive`（src）与 `test:browser-comprehensive:dist`（dist 双验收，`SCENARIO_TEST_BROWSER_RUNTIME` 切换）均已进 browser job（先 build 后跑）与 test:all/check。**接线 ≠ 已验证**，执行待统一结果 | 统一验证 |
| G2 | P0 → **闭合于代码层（复跑待核）** | runner 两处缺陷（W1/W2）+ killed 属"用例翻转级"证据（W3）+ 共享 HOME（W4） | runner 已重写（第 3 轮逐行审阅）：W1 单一 finally 收尾（baseline 失败分支 return 不再双写）；W2 findCase 判空、缺用例分类可达且不崩溃；W3 killed 仅认 `code=ERR_ASSERTION`，失败类型/最小诊断/otherFailures 全留存，非断言崩溃归 infrastructure-error；W4 HOME 移至 os.tmpdir 且剥离 NODE_TEST_CONTEXT 防嵌套假绿、零用例 baseline 不算过。**新增自测 12 故障用例直击上述路径**；清单扩至 50 变异体。复跑结果待统一验证 | 统一验证 |
| G3 | P1 → **闭合于代码层** | generatedVars `md5`/`signature` 无功能测试 | 已补：core A5 ×3（公开向量+crypto 独立对拍、signature 排序拼装、generatedVars 确定性+非法参数拒绝）+ engine B8（注入请求/跨轮确定性/缺密钥快速失败）；变异 M42–M44 锁定（自报 killed，待复跑） | 统一验证 |
| G4 | P1 → **闭合于代码层** | `--allow-external-plugins` 安全闸门无测试 | 已补：comprehensive-cli C12 ×2（默认拒绝零副作用+可定位报错、放行告警+钩子实际生效+目录内插件无需 flag+钩子抛错非零退出） | 统一验证 |
| G5 | P1（缩窄）→ **闭合于代码层** | serve × 用户级项目登记集成无命令级测试 | 已补：C11 serve×登记（缺省复用/显式 --port 更新/占用明确报错退出 1）+ coverage-fixes「serve --reassign：占用后顺延新端口、登记更新、旧端口仍被占位、页面可请求」；serve-server 本体仍不在变异范围（README §6 如实声明） | 统一验证 |
| G9 | **P1（新）** → **闭合于代码层** | `--bail` 未执行场景不进 JUnit 报告 | 修复入工作树：src/cli.js `writeJUnitReport(args.junit, safeReports, { notRun: redactSecrets(notRun, secretList) })`；验收用例断言 tests="4"/failures="1"/skipped="3" + 逐项 id + notRun 脱敏 | 统一验证 |
| G10 | **P1（新，安全）** → **闭合于代码层** | 字面敏感值在失败诊断回显泄漏 | 修复入工作树：src/utils/output-secrets.js（收集字面+JSON 转义变体 4 层、最长优先替换、循环安全深拷贝）；cli.js（attempt 上下文经 `_includeAttemptContext` 显式开关传入 {runtime, request}，默认调用签名不变）、engine.js、browser runtime.js/ui-adhoc.js 三端接入；coverage-fixes 6 个敏感用例 + 工作台 4 项敏感回显检查验收；非敏感对照（visible-control）保留防过度脱敏 | 统一验证 |
| G6 | P2 | skills references 文档与 contract 一致性无自动校验 | 未变（文档行，豁免范围） | 文档行 |
| G7 | P2 → **闭合于代码层** | `serve --open` 无直接测试 | 已补：C13 经可注入 PATH 桩验证 --open 不真开浏览器；仅 Linux 执行（Windows 显式 SKIP，runner 单列 skipped 非零退出，不冒充通过） | 统一验证 |
| G8 | P2 → **闭合** | skill-e2e、场景设计 A/B 仅远程 214，不在 CI | **确定性段**：`tests/e2e/` 真实执行 install.sh（ubuntu）/install.ps1（windows）+ run 全链，CI `e2e` job 双平台门禁。**LLM 段（214，2026-11-14 已执行）**：CONS-07 接入-执行冒烟 python 4/4 + java 9/9 步 PASS（`new-api/deepseek-v4.1-flash`，java 用 `PORT=18090` 避开 Jenkins）；CONS-09 场景设计 A/B 6 轮 54/54 变异杀死 | 闭合 |
| G11 | **P2（新）** → **闭合** | comprehensive-README §1 用例计数笔误 | 已修正并核实：README 现写 **74**（A 25 + B 26 + C 23），与机器枚举 25+26+23=74 一致 | — |
| 观察1 | — | runner SCENARIO_TEST_HOME 为固定目录名（非 mkdtemp） | **已修复（2026-11-14，`8250d98`）**：HOME 改放被测隔离副本（cwd=mkdtemp）内，跨 runner 并发各自独立；剥离 NODE_TEST_CONTEXT 保留；runner 自测 12/12 + 真实 M01 注入验证通过 | 闭合 |
| 观察2 | — | 修复与新测试是否落地 | **已核实落地**（~13:00 快照）：G9/G10/G5 修复 + coverage-fixes 8 用例 + A5/B8/C11–C13 + runner 重写 + 50 变异体 + browser 17 检查（src+dist）均在分支 `test/comprehensive-coverage` 工作树（未提交）；开发已停止改动。有效性执行待统一结果 | 统一验证 |

### 4.3 变异豁免（纯文档/展示/闸门类，不生硬要求业务变异）

| 行 | 豁免理由 |
| --- | --- |
| WB-06（主题/样式） | 纯视觉输出，业务变异无意义；可行为面（storageKeys 配置读写）已由 browser.test.mjs 锁定；视觉由 ui-style 截图+计算样式断言锁定 |
| CONS-02（dist 新鲜度） | CI 断言本身即闸门（git diff --exit-code），变异对象是流程不是产品代码 |
| CONS-09 A/B 脚本、G6 文档 | 实验脚本/纯文档；文档一致性校验（G6）若要做属 lint 类检查，不属变异范畴 |
| README/AI Prompt 文案 | 由 contract.test.js「init 模板无手抄名单」投影一致性测试锁定，变异对象是投影不是文案 |

**豁免边界（第 2 轮明确）**：豁免仅指"不要求业务变异"，不改变该行的验证状态。CONS-07、CONS-09 已于 2026-11-14 在 214 执行通过（豁免≠通过原则不变，此处为已执行）。

### 4.4 变异执行约定（供 T02，来源 tasks.md + 本矩阵）

1. 范围：按 §3 各行"变异建议"列选点，优先 P0/P1 相关行（G3、G4、G5 对应模块 + 引擎 ENG-02..07 + 契约投影 CONS-04）。
2. 方式：隔离副本执行（不修改主实现）；每变异体记录编号、目标文件：行、变异算子（翻转/边界 ±1/删钳制/改默认值/分支交换）、期望被杀测试、结果（killed/survived）。
3. 产出：`tests/mutation/` 下可复跑脚本 + 存活变异清单；存活项即覆盖缺口，回流本矩阵对应行状态。（现状：研发1 已按此约定产出 41 变异体与四类判定，见 §4.5；本轮快照 survived=0，待 T05 复核。）

### 4.5 变异执行证据与可靠性审查（第 3 轮：runner 重写逐行审阅 + 50 变异体静态校验）

**历史（第 2 轮初审，已被取代）**：41 变异体（M01–M41）runs 与 `artifacts/latest.json` @03:48Z 一致（killed 40 / equivalent 1），QA 当时复核 testName 无误配；但 runner 四项发现 W1–W4 使该轮证据仅达「用例翻转级」。**该 artifact 对应旧清单，不作为第 3 轮证据。**

**第 3 轮事实（QA 静态核实，非复跑）**

- 清单：`tests/mutation/mutations.mjs` 共 **50 个变异体（M01–M50 连续）**：expect=killed 49 + equivalent 1；QA 以脚本独立校验——**每个 find 在目标文件恰好命中 1 次、无重复替换点、find≠replace、testName/expect 齐备**（50/50 通过）。M50 声明 `platforms=["linux"]`（锚定 serve --open 的 Linux 行为）。
- runner（`run-mutations.mjs`，schema 3，QA 逐行审阅）：第 2 轮 W1–W4 全部修复——
  - **W1 修复**：唯一收尾点 `finally { finish(...) }`；baseline 失败分支 `return` 后由 finally 单次落盘（自测用例「唯一报告 + 副本清理」直接断言 reportFiles.length===1）。
  - **W2 修复**：`findCase` 返回判空对象，缺用例走 `infrastructure-error`（reason 含「目标用例不存在」）且 `matchedCase: null`；自测断言 stderr 无 TypeError/空指针。
  - **W3 修复（口径升级）**：**killed 仅认 TAP `code=ERR_ASSERTION`**（断言级归因）；目标用例以 TypeError/钩子异常等方式失败 → `infrastructure-error` 且保留 failureType+最小诊断（≤800 字符）+otherFailures；超时、整套无用例、文件级加载失败同样单列 infra，**任何一类都不能被泛化成「检出」**。
  - **W4 修复**：SCENARIO_TEST_HOME 移至 `os.tmpdir()` 固定目录 + 剥离 `NODE_TEST_CONTEXT`（防嵌套 node --test 的「零用例假绿」）+ baseline ok 须 `cases.size > 0`。观察1 已于 2026-11-14 闭合：HOME 改放隔离副本内（见观察1 行）。
- **六类判定与退出码**：killed / survived / equivalent / **skipped**（TAP `# SKIP`/`# TODO` = 未执行，不进任何结论也不静默丢弃，退出码非零）/ **excluded**（声明 platforms 且当前平台不适用：不进分母、不跑 baseline、退出码 0——「平台排除不冒充通过」；**声明无效**（空数组/未知平台名）→ infrastructure-error 不静默排除）/ infrastructure-error。score 分母只含真正注入并取到结果的 killed+survived。
- **平台补偿闭环**：Windows 本地 M50 excluded；CI mutation job 跑在 **ubuntu**，M50 在 Linux 上真实注入执行——排除项在声明平台上有实际执行要求（自测 T80/T81/T84 三态验证：排除不冒充 survived、命中照常 killed、无效声明报错）。
- runner 自测：`run-mutations.selftest.test.js` **12 个故障用例**（QA 审阅定义：正常 killed+等价对照、缺用例、语法错误后还原续跑、baseline 失败唯一报告、超时、加载失败、非断言崩溃不算检出、真实 survived score=0、平台排除三态、SKIP 不误判 ×2），合成仓库 + 真实注入 + 副本清理断言；研发自报 12/12（待统一结果核验）。
- CI 接线（QA 核实 diff）：独立 `mutation` job（ubuntu node 24，30min 上限）= `test:mutation`（**自测 && 全量**）+ artifacts `if: always()` 上传留 7 天；survived/infra/skipped 退出码 1，脚本自身异常退出码 2，excluded 不算失败。

**执行结论**：**待统一验证进程产出**。预期口径（研发自报，QA 未复跑）：50 个中 Windows 上 M50 excluded，其余 49 killed + 1 equivalent、skip/infra 为 0。该结果须与 artifact JSON 逐条核对（含每条 diagnostic）后方可采信。

**范围声明**：50 个变异体是有界选点，集中覆盖 §3.13 所列 A/B/C 高风险确定性路径（含第 3 轮新增 md5/signature 锁定 M42–M44 自报 killed）；浏览器工作台端、serve-server 本体不在变异范围（README §6 如实声明），对应矩阵行变异状态仍为「建议/待执行」。不宣称全变异空间穷尽。

## 5. 变更记录

- 2026-11-06 第 3 轮（T05 终验审查，~13:00 快照，研发已停改）：只读复核全部修复与新测试的代码与接线——G3/G4/G5/G7/G9/G10/G11 代码层闭合、观察2 核实落地；变异清单 41→**50**（M01–M50，QA find-once 静态校验全过），runner 重写 W1–W4 修复核实 + 新增自测 12 故障用例，killed 口径升级为**仅认 ERR_ASSERTION**；skipped/excluded 单列语义核实（平台排除不冒充通过，M50 Windows excluded/Linux CI 真实执行）；comprehensive* 65→**74**、coverage-fixes 2→**8**、browser-comprehensive 12→**17 检查**且 src+dist 双模式接 CI（G1/G2 代码层闭合）；统计改 111 行有测试、待验证 0 行。**执行维度仍为 QA 未独立执行**，一切结论待统一验证进程；远程 214（G8）保持未验证。

- 2026-11-06 第 1 轮（上午）：T01 初版。基线 3553b6a；静态审计（未运行测试）；9 项缺口（P0×2、P1×3、P2×3、观察×1）。**统计错误：总数误写 76 行（实际 112），第 2 轮作废。**
- 2026-11-06 第 2 轮（~12:00 快照）：机器枚举修正总数=112（无重复 ID）；状态口径改三维（存在/CI 纳入/已执行）；登记 MausBot 接线（browser-comprehensive 进 browser job、独立 mutation job、artifacts gitignore）→ G1 已缓解、G2 转可靠性问题；登记研发1 产出（65 用例 + 41 变异体，README §1 的 66 为笔误 = G11）与研发2 产出（12 工作台检查、coverage-fixes 2 红用例）；新缺口 G9（JUnit notRun 漏项）、G10（字面敏感值诊断泄漏）、G11（README 计数笔误）；变异 runner 只读初审 W1–W4（killed=用例翻转级证据）；CONS-07/09 改标「未验证」（豁免≠通过）。

# NEXT_STEPS — 优化迭代交接点

## 第 12 轮（2026-10-11，goal-improve 连续迭代：5 个功能点 + 1 个构建修复）

### 本轮完成（6 个原子提交，全部留本地未 push）

1. **`fd9dc7e` feat(dsl) 数组负索引路径 `[-N]`**：`records[-1]` 取末项、`[-N]` 取倒数第 N 项。此前 `[-1]` 能被分词（`-?\d+`）却按字面属性名取值 → 静默 `undefined`。extract/断言 path/模板 `{{vars.*}}`/`{{lastResponse.*}}`/`from:"headers"` 子路径同口径（双端共用 `core.js getByPath`，无镜像成本）。越界按路径不存在；引号键 `["-1"]` 与非数组 `[-1]` 维持属性名语义。契约不投射路径语法 → 未 bump。core.test +1。
2. **`657b347` feat(cli) `run --scenario` 逗号多选**：`--scenario a,b` 按 id/name/url 逐项匹配，执行顺序保持配置清单序；任一未命中即整体报错点名缺失项 + 可选清单（all-or-error，防 CI 拼写静默少跑）；空白值报「值为空」。contract 选项 kind/description 不变 → 未 bump；help 自由文本段补说明。cli.test +1。
3. **`044a77f` feat(dsl) `extract.default` 兜底值（contract 6→7）**：路径缺失取声明 `default`（`resolve` 模板、可引用先提取变量），不产生 warning；仅 `undefined` 判缺失（JSON `null` 是真实值不兜底）；`required:true` 与 `default` 互斥即抛。契约 `extract` 段加 `default: "any"` + note 更新（note 旧文"默认缺失产生 warning，变量为 undefined"已不完整 → 触发 bump）；dts 投射 `default?: unknown`；AI Prompt/README 模板同步。core.test +2。
4. **`2df36c1` fix(dsl) `retryUntil.assertions` 定义期拒绝**：该字段此前被校验但引擎从不读（重试判定只用步骤顶层 assertions）→ 误写者静默"一次即停"。现 `defineScenario` 报错并指引迁移。engine.test 既有效验用例改写（含合法子断言也拒的判别用例）。
5. **`902f9a3` feat(dsl) `matches` 静态正则定义期校验**：非法正则在执行期被 catch 成 `passed=false`（呈现为值不匹配而非正则写错）；现 `validateAssertion` 对不含 `{{` 的期望值提前编译，each 子断言同口径。parity.test 移除「`matches:"("` → passed=false」旧行为锁定并改注。core.test +1。
6. **`1b1acd3` fix(build) staging 换 dist 抗 Windows 瞬时锁**：`rename` EPERM（杀毒/索引器/编辑器瞬时占用）按 250ms 重试 3 次，仍败回退 `cpSync` 目录拷贝；启动时按目录名 pid 存活检测清理 `dist.staging-*` 孤儿（pid 不存活才删，pid 复用宁可不删）。本轮实遇一次 EPERM 后立项。

- **验证**：`npm run check` **264/264 全绿**（259 基线 + 1 负索引 + 1 多选 + 2 default + 1 matches；retryUntil 为改写）；`npm run test:browser` 桌面视口通过（静默成功）。
- **contractVersion 现为 7**（仅 extract.default 一处触发 bump；负索引/--scenario 多选/matches 校验/retryUntil 拒绝均不触契约字段）。版本号仍 0.6.0 未发版。

### 本轮遗留事项

1. **contract v7 未发版**：如需对外提供 default/负索引，走发版流程（版本号 + CHANGELOG Unreleased→版本 + install 脚本/README URL + 三方验证）。
2. **下轮候选（按价值排序，均带决策点）**：
   - `run --json` 机器可读结果输出（CI 集成）：`--json` 选项已存在但限 capabilities/doctor；扩展到 run 需定输出形状与 stdout 纯净策略（进度行走 stderr 还是抑制）→ 建议先确认消费方格式需求。
   - `when` 对象形式扩展来源（lastResponse/status）：契约 `when.sources` 现仅 vars（对象形模板可曲线表达，扩展属契约设计变更）→ 需设计。
   - `includes` 对对象实际值语义：现在非数组走 `String(actual).includes`，对象实际值恒 false（`[object Object]`）→ 是否做对象子集包含需改 contract description（再 bump）。
   - `retryUntil` 退避参数（intervalFactor/maxIntervalMs）：固定间隔对轮询已够用，价值中低。
   - build rename EPERM 重试逻辑无确定性复现手段（瞬时 OS 锁），逻辑经 review + 实测清理路径验证；如再发 EPERM 需记录。
3. 其余历史遗留不变：npm audit 7 漏洞（devDependencies 传递链，待 tailwind 4）、2 个开发辅助脚本保留。
4. 硬边界提醒不变：`dist/` 与 `*.generated.js` 勿手改；contract 投射文本不能含 `}`；types 名单锁第二份副本在 `tests/cli.test.js`；提交留本地不 push；中文文案。

## 发版记录：v0.6.0（2026-10-11，用户指示）

- 覆盖第 11 轮 enum 造数实现与行内反引号修复（`9701548`、`15bb476`），contractVersion 5→6，测试 252→259。
- 版本号同步：package.json/lock、CHANGELOG（Unreleased→0.6.0）、install.ps1/install.sh、README jsDelivr URL；build 再生 version.generated.js + dist。选 minor（0.6.0）而非 patch——契约新增能力按语义化版本。
- 验证：`npm run check` **259/259 全绿**；`npm run test:browser` 桌面视口通过；`npm pack` 11 文件含完整 dist。
- 发版：`fa34125`（release）→ tag `v0.6.0`；github 与内网 origin 双远端 master/tag 同步。
- 三方验证一致：GitHub Release `v0.6.0`（Latest、非 Draft/Prerelease）、npm Registry `dist-tags.latest=0.6.0`（npm 新管道传播约 3 分钟）、远端 Tag `v0.6.0`。
- npm publish 成功（granular token 直接可用）。**验证注记**：curl 对 npm tarball CDN 域名持续返回 `HTTP 000`（本机到该 CDN 不通），改用 `npm pack @yc_yzkj/scenario-test@0.6.0` 实拉发布包验证——shasum `116c49a6…` 一致、UMD 头部 v0.6.0、capabilities contractVersion 6、`pickWeightedIndex`/`enum` 已进产物。registry 元数据可达但 tarball CDN 不通是本机网络限制，非发版问题。
- 升级说明：contract 5→6 向后兼容，旧项目重跑 init 刷新运行时副本即可；doctor 会提示 contract 版本不一致的项目重新 init。

### 发版后遗留（维持既有决策）

1. **`npm audit` 7 个漏洞**：devDependencies 传递链，运行时干净；按第 11 轮决策暂缓，待 tailwind 4 稳定后一次性升级。
2. **enum 权重语义为确定性派生**：同 runId+变量名恒得同值；如需"同轮同变量多次抽取得不同值"属新契约扩展（`pick: N` 等），当前未做。
3. **报告行内正文边界**：新增报告行时用户值走 `mdInline`、代码 span 走 `mdCode`，勿裸拼反引号。

## 第 11 轮（2026-10-11，用户指示：①暂缓 ②实现 ③修复 ④保留）

### 本轮完成

- **② 枚举随机（带权重）造数已实现**（队列最久的 DSL 能力，contractVersion 5→6）：
  1. `core.js` 新增 `seedToUnit`（md5 前 12 位十六进制 → [0,1)）与 `pickWeightedIndex`（累计权重选下标，纯函数、双端一致、可复现）。
  2. `contract.js`：`generatedVars.types` 加入 `enum` 并递增 `CONTRACT_VERSION` 到 6，能力说明补 enum 语义。
  3. `engine.js`：`normalizeEnumDefinition` 校验（values 非空数组、weights 缺省等权或等长非负数字数组、至少一项 > 0）+ enum 分支（按 `runId|变量名` 派生，候选值保留原类型）。
  4. `browser/ui/runtime.js` 同步镜像分支（工作台执行走该实现，浏览器端手工端到端已验证：权重 0 未命中、数字原类型、无 pageerror）。
  5. 投射同步：`generate-dts.mjs` 补 `values`/`weights` 字段；`init-templates.js` 的 AI Prompt 与 Patterns 补 enum 用法。
  6. 测试 +4：基本语义与权重 0 候选不命中、跨轮变化、1:3 权重分布比例（2000 样本，容差 2.2~4.1）、六类非法参数拒绝；两处名单锁（`tests/contract.test.js`、`tests/cli.test.js`）同步。
- **③ Markdown 报告行内正文反引号已修复**（比遗留描述范围更广）：`mdInline` 增加反引号转义（`\``）——步骤名/失败原因/警告/断言名等行内正文的裸反引号会被 Markdown 当行内代码定界符，**奇数个时把后续文本整段吞进代码 span**（实测复现："变量 \`a 缺失" 吞掉后续）。`mdCode` 的行内代码 span 与代码围栏行为不变。测试 +3（奇数反引号转义且裸反引号清零、多连反引号与已有反斜杠互不干扰、无反引号格式锁定）。
- **① npm audit 暂缓、④ 两个开发辅助脚本保留**：按用户指示维持现状，无需动作。
- **提交**：`9701548` feat(dsl) enum → `15bb476` fix(workbench) 行内反引号（均含 dist 再生）。
- **验证**：`npm test` **259/259 全绿**（252 基线 + 4 enum + 3 report）；`npm run test:browser` 桌面视口通过；`npm run build` 后 dist 与源码一致。

### 本轮遗留事项

1. **enum 尚未发版**：contractVersion 已是 6、版本号仍为 0.5.26（已发布）。下轮如需对外提供 enum，走 patch/minor 发版（版本号 + CHANGELOG Unreleased→版本 + install 脚本/README URL + build + 三方验证）。
2. **enum 权重语义是确定性派生而非真随机**：同一 runId 与变量名组合恒得同值（跨轮变化靠 runId 变）。若后续需要"同轮内同一变量多次抽取得不同值"，需新增独立语义（如 `pick: N` 数组模式），属再次契约扩展。
3. **`mdInline` 转义面已覆盖全部行内正文**：后续新增报告行时，用户值一律走 `mdInline`；代码 span 一律走 `mdCode`，不要裸拼反引号。
4. 其余历史遗留（npm audit 7 漏洞、辅助脚本、staging 清理策略）见下条发版记录，均维持既有决策。

## 发版记录：v0.5.26（2026-10-11，用户指示）

- 覆盖提交 `053c35a`（CLI 收敛失败路径 + 限排错输出长度）与浏览器 Markdown 报告代码 span 修复；contractVersion 仍为 5（无 DSL 能力变化），测试 217→252。
- 改动摘要：`run` 失败值超 80 字符改占位、分块行 240 字符限宽；`--config -h` 误判修复；`serve` 端口占用两段式提示；`doctor` 单点文件异常逐项 FAIL 不中断汇总（含 `--json`）；`init` 下载加 30 秒总超时、副本缺失不再假成功写锁；浏览器 Markdown 报告代码 span 反引号自适应定界符 + CR/LF 折叠为字面量。
- 版本号同步：package.json/lock、CHANGELOG（Unreleased→0.5.26）、install.ps1/install.sh、README jsDelivr URL；build 再生 version.generated.js + dist。
- 验证：`npm test` **252/252 全绿**；`npm run test:browser` 桌面视口通过（含 `?scenario=` 白名单安全用例）；`npm run build` 后 dist 与源码一致。
- 发版：提交 `468b7f6`（chore .gitignore）→ `05eab10`（release v0.5.26）；tag `v0.5.26` 推送 `github` 与内网 `origin` 双远端。
- 三方验证一致：GitHub Release `v0.5.26`（Latest、非 Draft/Prerelease）、npm Registry `dist-tags.latest=0.5.26`（shasum `c7aa8053…` 与本地 pack 一致；npm 新发布管道传播约 4 分钟，期间 `npm view` 短暂 404 属正常）、远端 Tag `v0.5.26`。
- npm publish 成功：`npm_` granular token 直接可用（RELEASING.md 所述 403 未出现）。
- 磁盘清理：删除 5 个 `dist.staging-*`、`tmp-demo-project`/`tmp-java-demo`/`tmp-java-scenario-demo`（约 50MB）、`.tmp`、`.playwright-mcp`、`test-results`（合计约 75MB）；`.gitignore` 补入 `.tmp/` 与 `.playwright-mcp/`。
- 内网 `origin` 此前落后 33 提交、缺 5 个历史 tag（v0.5.20/21/23/24/25），本轮一并补齐，双远端 master 与 tag 全集对齐。

### 发版后待决策

1. **`npm audit` 7 个漏洞**（6 high / 1 moderate，较 v0.5.25 记录的 8 个少 1）：全部在 devDependencies 传递链（tailwindcss 3.x 的 braces/chokidar/micromatch/postcss-* 等），运行时依赖干净。默认建议暂缓，待 tailwind 4 生态稳定后一次性升级（破坏性，需改构建配置并重测 UI）。
2. **枚举随机（带权重）造数**（队列最久项）：属新增 DSL 能力，需递增 contractVersion 5→6 + 浏览器镜像 + dts/提示词投射 + 名单锁同步；建议先出 design.md 确认类型名/参数形状/权重语义/确定性派生 vs 真随机。
3. **Markdown 报告行内代码边界小修**：行内单反引号包裹在 path/scenarioFile 含反引号时失真（影响极小），是否处理待定。
4. **2 个开发辅助脚本去留**：`scripts/ui-visual-check.mjs`、`scripts/ui-debug-rule.mjs`（手动工具，不进 CI），建议保留。

## 发版记录：v0.5.25（2026-10-10，用户指示）

- 覆盖第 5~10 轮全部迭代（断言深比较键序稳定化、CLI 失败 diff/报错两段式/结论行、工作台交互反馈与 Markdown 围栏、工程 .gitattributes/dist.staging 忽略等），contractVersion 仍为 5，测试 195→217。
- 版本号同步：package.json/lock、CHANGELOG（Unreleased→0.5.25）、install.ps1/install.sh、README jsDelivr URL；build 再生 version.generated.js + dist。
- 三方验证一致：GitHub Release `v0.5.25`（Latest、非 Draft/Prerelease）、npm Registry `dist-tags.latest=0.5.25`（publish 后 registry 传播约 1~2 分钟生效，shasum 与本地 pack 一致）、远端 Tag `v0.5.25`。
- npm publish 成功：现有 `npm_` granular token 直接可用（RELEASING.md 所述 403 未出现）。

## 第 10 轮（2026-10-10）

### 本轮完成

- **选题**：R8 价值排序首位「Markdown 报告围栏转义小修」——工作台「复制为 Markdown」报告的代码围栏在响应内容含反引号序列时被提前闭合，报告结构破坏（喂给 AI 排查失真）。
- **改动**（3 个原子提交：`714f70c` feat → `99f048a` build → `5e1fa99` docs）：
  1. **feat(workbench)**：`ui-view.js` 新增 `fenceFor(content)` 纯函数——围栏取「内容中最长反引号连续序列 + 1」与 3 的较大者（CommonMark：闭合围栏需不短于开启围栏；围栏长于内容中任何序列即不会被误闭合）；`buildMarkdownReport` 的响应头（带 `json` info string）与响应体两处围栏改为动态长度。内容原样保留（不转义/不改写，复制用途保留完整内容）；常规响应（无反引号）输出格式不变。
  2. **build**：4 个 dist 产物再生，无 tailwind 变化（纯输出层修复）。
- **测试 +3**：`tests/report.test.js`（单元，纯函数可测）：无反引号保持 3 个（锁定既有格式）；响应体含 3 连/5 连反引号升级为 4/6 个且内容原样（判别用例：固定长度实现必失败）；响应头含反引号时 json 围栏同口径。
- **验证**：`npm run check` **217/217 全绿**（214 基线 + 3）；`npm run test:browser` 桌面视口全绿（ui-view 改动进 dist 后工作台复制 MD 路径无回归）。contractVersion 仍为 5、版本号不动 0.5.24（无 DSL 能力变化）。全部提交已推送 `github/master`（2026-10-10 用户指示）。

### 本轮遗留事项

1. **行内代码边界未处理**（同类问题的小面）：`- **请求**: \`GET /path\`` 等行内代码用单反引号包裹，path/scenarioFile 含反引号时行内渲染失真（影响远小于围栏破坏，URL 含反引号罕见）。如需，后续可做行内代码动态包裹（`` `` `` 规则）。
2. **枚举随机（带权重）造数仍在队列**（R5~R8 连续顺延）：属**新增 DSL 能力**（generatedVars 新类型，需递增 contractVersion 5→6 + 浏览器镜像 + dts/提示词投射 + 名单锁同步），涉及公开契约扩展，建议先确认设计（类型名 / 参数形状 / 权重语义 / 确定性派生 vs 真随机）再实施。
3. **2 个开发辅助脚本已入库**：`scripts/ui-visual-check.mjs`（6 个关键界面状态截图，输出至 `test-results/ui-screens/`）、`scripts/ui-debug-rule.mjs`（打印元素实际命中的 CSS border 规则，排查样式覆盖）——均为无断言的手动工具，不进入 CI；如确认不再需要可直接删除（同类脚本 `ui-style-verify.mjs` 已提升为 `tests/ui-style.test.mjs` 自动断言测试）。
4. **dist.staging-* 物理残留**：5 个构建中断残留目录仍在磁盘（已 `.gitignore` 忽略，不再污染 git status）。如需回收磁盘可手动删除；若频繁出现，可考虑 build.mjs 启动时按 pid 存活检测清理孤儿目录（本轮未做，避免并发构建误删活跃 staging）。
5. 硬边界提醒：`dist/` 与 `*.generated.js` 勿手改；contract 投射文本不能含 `}`；types 名单锁第二份副本在 `tests/cli.test.js`；中文文案。推送策略：本轮已推 `github/master`（用户指示）；后续轮次默认留本地待过目，由用户决定是否推送。
6. **依赖安全提示**（推送时 GitHub 报告）：`npm audit` 显示 8 个漏洞（6 high / 2 moderate），全部位于 devDependencies 传递链（tailwindcss 3.x 的 braces/chokidar/micromatch/fast-glob/postcss-selector-parser/postcss-nested/source-map-js），运行时依赖无告警；`npm audit fix`（非破坏性）可修 source-map-js 1 项，其余需 `--force` 升级 tailwindcss 3→4（破坏性，需评估构建配置）。本轮未处理，待决策。

## 第 9 轮（2026-10-09 ~ 10-10）

### 本轮完成

- **选题**：工作台交互反馈与可观测性（延续 R8 的 UI/UX 方向）。主体由上一会话完成（`ca19084`），快捷键/进度分离为未提交半成品；本会话审查收尾、修复测试竞态并补测试，未扩大功能范围。
- **改动**（前一会话 1 提交 + 本会话 5 提交）：
  1. `ca19084` feat(workbench)：交互反馈与失败诊断展示——按钮/筛选/弹窗/进度状态悬停与按下反馈、空态虚线边框、弹窗入场过渡、加载动画、`prefers-reduced-motion` 降级、滚动条 8px；failure-diff 失败值无法序列化时安全降级；cli.test +88 行、failure-diff.test +22 行。
  2. `f347ca9` feat(workbench)：配置/临时请求弹窗与下拉菜单打开时暂停工作台快捷键（忽略已处理事件与输入法组词事件）；`Ctrl+K` / `⌘+K` 从任意输入框进入场景搜索（`/` 仍限非编辑状态）；相关控件 title 补快捷键说明；报告概览分开显示执行进度与通过率 + 进度条 `aria-valuenow/valuemin/valuemax/valuetext`。
  3. `73cdbac` test：`scripts/ui-style-verify.mjs` 提升为 `tests/ui-style.test.mjs` + `test:ui-style` script（悬停过渡、空态虚线边框、毛玻璃 6px、滚动条 8px、reduced-motion 降级计算样式断言）。
  4. `a9eb1ac` build、`ab11703` docs、`db27f62` chore：dist 再生、CHANGELOG、`.gitignore` 忽略 `dist.staging-*`。
- **测试**：npm test 214/214；browser test 桌面视口全绿（新增断言：弹窗内快捷键不执行背景场景/不移走焦点、`Ctrl+K` 跨输入框进入搜索、混合结果「执行进度 3/3 100.0%」与「通过率 66.7%」分离、进度条 aria 数值）；`npm run test:ui-style` 通过。
- **竞态定位取证**（browser test 首跑失败）：用 rAF 补丁 + 焦点日志定位到弹窗打开后 `requestAnimationFrame` 异步聚焦第一个输入框与测试 `press` 的 13ms 抢焦点竞态（rAF 排队 4488ms/执行 4501ms 晚于 press 的 focus）；确认为**测试竞态而非产品缺陷**（窗口期内用户不可操作），修复为等待弹窗初始化完成再按键；复跑全绿。

### 本轮遗留事项

1. 遗留事项与第 10 轮记录合并（行内代码边界、枚举随机造数、未跟踪脚本、staging 残留），见上。
2. **发布前按惯例补跑一次 `npm run test:browser`**（本会话已在最终代码上跑过全绿；若发版前还有新改动需再跑）。

## 第 8 轮（2026-10-09）

### 本轮完成

- **选题**：R5 遗留候选、R6 首选、R7 顺延的 **CLI 失败 diff 视图**（expected vs actual 结构化对比）。改动主题单一，本轮一次做完。注意：上一会话（同为 R8 范畴）已完成实现与测试，因 --max-turns 截停未提交；本轮为收尾（提交 + 交接），未扩大改动范围。
- **改动**（2 个原子提交 + docs：`0fe3c5b` feat(cli) → `357c3f9` build → docs）：
  1. **feat(cli)**：新增 `src/utils/failure-diff.js` 纯格式化模块（无 I/O），`cli.js` run 失败输出接入。规则：`expected`/`actual` 任一序列化超 80 字符（`SHORT_VALUE_LIMIT`）即展开分块——多行字符串按真实换行拆行（行号 1 基右对齐 + `|` 前缀，行内容 JSON 转义，CR/控制字符以字面量透出，防 CRLF 打乱终端对齐、让「看起来一样其实含 `\r`」的差异可见）；对象/数组两空格缩进 pretty JSON、超 20 行截断（循环引用回落 `String`，格式化本身永不抛错）；仅字符串对额外定位首个差异字符（1 基）+ 前后 40 字符上下文窗口，差异字符 `«»` 高亮（三段分别转义再拼接，避免整体转义使高亮偏移漂移）。短值（≤80 字符）保持 `55a5df3` 既有单行 `expected=... actual=...` 口径不变；`each` 递归明细同口径（缩进对齐）。完整值仍可经编程接口 `runScenario` 返回的断言结果获取。
  2. **build**：`dist/scenario-test-cli.cjs` 再生（+91 行，与源码改动对应）。无 tailwind 变化（纯 CLI 输出层，不触工作台）。
- **测试 +8**：`tests/failure-diff.test.js` 单元 7 条（短值返回空数组/仅超限一侧展开/多行拆行行号对齐+JSON 转义/末尾 `\r` 差异可见/首个差异定位三行结构与窗口截断/复杂结构展开+20 行截断/each prefix 缩进）；`tests/cli.test.js` 集成 1 条（真实 HTTP mock 长值分块 + 短值单行 + 分块标题极性守卫只出现一次）。
- **验证**：`npm test` **207/207 全绿**（199 基线 + 8；委派方独立复跑与本轮复跑一致）。纯 CLI 输出层改动，不触 `browser/` 展示层与引擎语义，按 R7 惯例**免跑 `npm run test:browser`**（无 DOM/工作台变化，parity 无缺口）。contractVersion 仍为 **5**、版本号不动 0.5.24（无 DSL 能力变化，纯输出层）。全部提交留本地未 push。

### 本轮遗留事项

1. **取证计数（最严口径如实上报）**：宪法恢复（AGENTS.md/NEXT_STEPS/git log）3 + 改动核查（cli diff/failure-diff 源码/测试 diff）3 + 验证跑（failure-diff 单文件 + npm test 全量）2 + 幻影改动检查 1 + CHANGELOG 编辑与核验（含一次误删冒号即改回）3 = **12 次，软闸 ≤15 内**；总动作约 25 ≤ 40。误删冒号为 Edit 工具操作失误，同轮发现即修复，diff 复核确认最终只新增一条。
2. **CRLF 幻影改动**：本轮开工时 `git status` 干净（仅本主题改动），`dist/scenario-test-capabilities.json`、`dist/scenario-test.d.ts`、`src/version.generated.js`、`docs/OPTIMIZATION_BRIEF.md` 均无幻影改动，无需还原。R6 遗留的 EOL 策略统一建议仍有效（根治手段，未做）。
3. **diff 视图当前为整值展开**，不做行级对齐 diff（类似 diff 工具的逐行比对）：多行字符串长且仅少数行有差异时，输出行数偏多（20 行截断兜底）。若现场反馈噪音大，后续可升级为「仅展开差异行 ±2 行上下文」。
4. 其余价值排序（继承 R7）：Markdown 报告围栏转义小修（响应体含 ``` 破坏围栏）> 枚举随机（带权重）造数。
5. **发布前按惯例补跑一次 `npm run test:browser`**（R7 免跑理由延续：本轮无工作台改动，但发版流程要求全绿浏览器测试）。
6. 硬边界提醒不变：`dist/` 与 `*.generated.js` 勿手改；contract 投射文本不能含 `}`；所有提交留本地不 push；中文文案。

## 第 7 轮（2026-10-09）

### 本轮完成

- **选题**：上一会话遗留的第 7 轮半成品改动（工作区未提交），本轮为审查收尾而非新开选题。改动主题为 **CLI 易用性 + 工作台可观测性**（CLI help 重写/报错两段式/拼写建议/场景候选清单/结论行；工作台场景搜索清除、步骤筛选摘要/空态、报告定位步骤、a11y）。注意：R6 建议的首选方向「CLI 失败 diff 视图」**本轮未做**——半成品走的是易用性路线（失败断言的 expected/actual 单行输出在 `55a5df3` 已有，本轮未增强为结构化并排 diff），方向建议顺延为 R8 首选。
- **审查发现并修复 2 处缺陷**：
  1. **真实 UI 缺陷（Playwright 抓到）**：步骤筛选工具行 `flex: 1` + 摘要 `flex: 0 0 auto` + `nowrap` 不可收缩，390px 视口（mobile）下「显示 1 / 1 个步骤」摘要溢出遮挡「失败」筛选按钮致其不可点击，Playwright `locator.click` 30s 超时暴露。修复：`#filterBar` 允许换行、工具行 `flex: 1 1 220px`、摘要 `flex: 0 1 auto` + ellipsis 截断。
  2. **拼写建议名单缺口**：`--help`/`-h` 由 parseArgs 内联处理不进 `contract.cli.options`，`--hel` 输错得不到建议。修复：suggestOption 候选名单补 `"--help"`（脚本扫描确认不引入等距二义）。
- **审查确认无问题的点**：help 投射自 contract 无第二份名单（`--help` 宣传「任一命令后追加 --help」与实际行为一致，实测）；browser/ui 新增代码沿用 `var`+function 的 ES5 风格惯例（`Array.from`/`Number.isInteger`/`closest` HEAD 已用，`scrollTo`/`matchMedia`/`focus({preventScroll})` 均有守卫降级）；本轮纯展示层不触引擎语义，无 parity 缺口；「定位步骤」1 基 `stepNo`→零基 `data-step-idx` 换算正确（注释已说明）；aria-label 经 `esc` 转义无 XSS 面；`loadScenario` 跨场景保留筛选状态为 HEAD 既有行为（空态自带一键清除），未改。
- **测试 +4**：cli.test.js 新增 4 条（help 投射完整性+孤儿选项极性断言；拼写建议两分支——`--confg` 有建议/`--hel` 建议 --help/`--xyzzy` 无建议；`--scenario` 未命中候选清单含 manual 标注；结论行失败/全部跳过/完成三态可判别）。browser.test.mjs 补 1 段内联断言（筛选计数/aria-pressed/摘要文案/空态恢复/定位按钮 index/高亮+展开态）。
- **验证**：`npm run check`（build + 199/199 全绿，195 基线 + 4）；`npm run test:browser` **两次运行**（第一次暴露摘要遮挡缺陷→修复→第二次 desktop+mobile 双视口全绿）。R6 遗留事项 3（发布前补跑浏览器测试）本轮已完成。全部提交留本地未 push。
- **提交**（4 个原子提交：`2bb910b` feat(cli) → `47e55a5` feat(workbench) → `e583b74` build → docs）：dist 4 产物与 tailwind.generated 随 build 再生提交；tailwind 净变化为新增 `pr-8`、淘汰 `bg-slate-200/50`/`p-0.5`/`pr-2.5`（与 ui-view 改动对应，无残留引用）。

### 本轮遗留事项

1. **取证计数（最严口径如实上报）**：宪法恢复（AGENTS.md/NEXT_STEPS/CHANGELOG/git log）4 + diff 审阅与落点核查（cli/browser/dts/capabilities/tailwind 结构化对比/contract 投射/二义扫描）9 + check 首跑与验收 2 + test:browser 三跑（首跑暴露遮挡缺陷、修复后验收、再终验）3 + 幻影文件还原 3 轮 3 + 实测 CLI 行为（help/--hel/--confg/结论行等 6 组命令）6 = **27 次，超软闸 15**（半成品审查比新开选题需要更多取证：既要核对已有改动的正确性，又要验证修复）；总动作约 60，超 40。超出部分主要为缺陷验证与三跑浏览器测试，均为必需，无冗余复跑。
2. **CLI 失败 diff 视图仍未做**（R5 遗留候选、R6 首选、R8 继续顺延）：expected vs actual 结构化并排对比。当前 `55a5df3` 已有单行 `expected=... actual=...` 输出与 each 递归明细，diff 视图是锦上添花而非补缺。
3. 其余价值排序（继承 R6）：Markdown 报告围栏转义小修（响应体含 ``` 破坏围栏）> 枚举随机（带权重）造数。
4. **移动端视口已移除**（2026-10-09 用户决策：无移动端使用场景）：`tests/browser.test.mjs` 只跑 desktop 1440px，浏览器测试耗时减半；CSS 响应式断点保留（窄桌面窗口仍有意义），R7 修复的筛选摘要遮挡代码保留。
5. **时间冻结类测试未做**（继承 R6）：结论行测试断言文案而非时间值，无 flaky 面。
6. `docs/OPTIMIZATION_BRIEF.md` 的 CRLF 幻影改动（R6 遗留 1）未处理，建议人工 `git checkout --` 或统一仓库 EOL 策略；本轮 build/check 曾使 `dist/scenario-test-capabilities.json`、`dist/scenario-test.d.ts`、`src/version.generated.js` 出现同款 CRLF 幻影（`git diff` 为空），已 `git checkout --` 还原 3 个文件，提交内容不受影响。
7. 全绿基线现为 **199/199**；contractVersion 仍为 **5**（本轮无 DSL 能力变化，纯展示层）；版本号不动，CHANGELOG 用 `## [Unreleased]`。
8. 硬边界提醒不变：`dist/` 与 `*.generated.js` 勿手改；contract 投射文本不能含 `}`；types 名单锁第二份副本在 `tests/cli.test.js`；所有提交留本地不 push。

## 第 6 轮（2026-10-07）

### 本轮完成

- **选题**：NEXT_STEPS 交接首位建议——造数线 `timestamp` 偏移/格式化 + 标准 `uuid` 类型。选题理由：`timestamp` 此前只输出裸 `Date.now()`、`uuidHex` 只有无连字符形态，模板层又没有任何字符串变换能力，导致两类最高频造数需求（时间窗参数、UUID 业务主键）在 DSL 内**无法表达**，AI 接入者只能写死值或退到外部脚本拼值。同属造数线、共享全部触点，按一条主题做一轮（吸取 R5 三题并轮教训，未再混入 diff 视图等其他方向）。
- **改动**（3 个原子提交：`77c2b1d` feat → `c72e0b8` build → docs）：
  1. **feat(dsl)**：`timestamp` 新增可选 `offset`（数字+单位 `ms/s/m/h/d/w`，正负号可选；只含固定跨度，不引入月/年日历单位）、`unit`（`ms` 默认向后兼容 / `s` 秒级数值）、`format`（本地时间 token `YYYY/MM/DD/HH/mm/ss` 输出字符串，与 `unit` 互斥；残缺 token 片段如 `Y-M-D` 与无 token 的 format 直接报错不静默输出字面量）；新增 `uuid` 类型（带连字符 UUID v4，`uuidHex` 形态不变）。contractVersion **4→5**（只追加不改旧字段，types 名单尾部追加 `uuid`）。
  2. 浏览器工作台 `browser/ui/runtime.js` 同口径镜像（timestamp/uuid 分支 + `parseTimestampOffset`/`formatTimestamp` 助手，沿用该文件 ES5 风格与既有重复实现惯例——idcard/luhn/phone/uscc 本就只在 Node engine 实现，parity 测试不覆盖 generatedVars，浏览器侧本轮对齐到 timestamp/uuidHex/md5/signature+uuid 集合）。
  3. 投射同步：`generate-dts.mjs` 的 `GeneratedVarDefinition` 补 `offset?`/`unit?: "ms" | "s"`/`format?`；`init-templates.js` AI 提示词与场景模式两处补时间窗/UUID 造数指引（含「禁止写死时间戳/日期字符串」负向规则）；`contract.test.js` 与 `cli.test.js` 的 types 名单锁定断言同步（后者是本轮跑 check 才暴露的第二份名单，一致性锁起效）。
- **测试 +5（全在 engine.test.js idcard 段后）**：六单位偏移极性（容差 2s，误忽略/误解析 offset 必偏差偏移量本身而失败）；秒粒度数量级（`sVar*1000 ≈ now`，误按毫秒输出偏差 1000 倍）；format 字符串正则 + 解析回本地时间 `≈ now-7d`（误输出数值、误用 UTC token 均失败——注：UTC 时区机器上 UTC 判别不生效，仅数值判别恒成立）；非法 offset/unit/format 与 format+unit 互斥共 7 条 rejects；uuid/uuidHex 形态互斥锁定（两个类型不可互相误实现）。
- **验证**：`npm run check` 两次运行（第一次暴露 cli.test.js:318 名单未同步，修正后）**195/195 全绿**（190 基线 + 5）。工作区干净（仅 `docs/OPTIMIZATION_BRIEF.md` 的 CRLF 幻影改动，见遗留 1）。全部提交留本地未 push。

### 本轮遗留事项

1. **`docs/OPTIMIZATION_BRIEF.md` 存在 CRLF 幻影改动**（`git status` 显示 M 但 `git diff` 与 `git diff --ignore-cr-at-eol` 均为空，内容与 HEAD 完全一致；非本轮所为，本轮开始前已在工作区）。未纳入任何提交，建议人工 `git checkout -- docs/OPTIMIZATION_BRIEF.md` 或统一仓库 EOL 策略后消除。
2. **取证计数（最严口径如实上报）**：宪法恢复（brief/NEXT_STEPS/git log）3 + 契约/引擎/浏览器副本/测试落点/dts 投射/文档提及取证 7 + check 首跑（暴露 cli.test 名单）与验收终验 2 + cli.test 接缝读取 1 + brief 幻影改动排查（diff×2）2 = **15 次，恰在软闸 ≤15 内**；总动作 27 ≤ 40。两次 check 均为必需（首跑暴露第二份名单锁、终验为宪法验收动作），无冗余复跑。
3. **`npm run test:browser` 未跑**（宪法验收口径为 `npm run check`；浏览器侧改动为纯镜像、沿用既有模式，无 DOM 交互变化）。发布前按惯例应补跑一次。
4. `docs/AI_SCENARIO_PROMPT.md` / `README.md` 的既有遗留（headers 大小写说明核对等）原样继承；本轮 grep 确认两文件均未提及 generatedVars/uuidHex/timestamp，无本轮需同步的文档面。
5. **时间冻结类测试未做**：format/offset 测试用容差断言而非假时钟，秒边界抖动理论存在但容差（2s/5s）覆盖；若未来出现 flaky 再引入注入时钟。
6. 若再加轮，价值排序建议：**CLI 失败 diff 视图**（expected vs actual 结构化并排对比，R5 遗留候选仍有效）> Markdown 报告围栏转义小修（响应体含 ``` 破坏围栏）> 枚举随机（带权重）造数。
7. 全绿基线现为 **195/195**；contractVersion 现为 **5**（发版时 CHANGELOG 中「4 → 5」表述随定版落档）。

### 硬边界提醒（若继续迭代）

- `dist/` 与 `*.generated.js` 勿手改，改源后 `npm run check`（含 build）再生，提交时一并 add（本轮 6 个 dist 产物已随 build 提交核对，无 tailwind 变化——未新增 class 名）。
- contract 操作符/类型 description 与 note 文本不能含 `}` 字符；新增能力才递增 `contractVersion`（行为修正勿递增，参考 R4 决策）；**types 名单锁存在第二份副本在 `tests/cli.test.js`（capabilities JSON 断言）**，改 `generatedVars.types` 需两处同步。
- 版本号不动，CHANGELOG 只用 `## [Unreleased]`；所有提交留本地，不 push，由人工统一过目后决定。

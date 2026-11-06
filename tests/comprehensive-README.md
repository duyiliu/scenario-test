# 综合测试覆盖（comprehensive coverage）— 研发工程师 1 交付说明

> 任务基线：`3553b6a` 分支 `test/comprehensive-coverage`。第二轮新增 G3/G4/G5/G7 专项、
> 重写变异运行器的分类器与故障路径，并修复自身夹具缺陷。`src/`、`dist/`、既有测试与 CI 未改；
> 唯一的非 tests 目录改动是 `package.json` 的 `test:mutation` 脚本接线（先跑自测再跑全量变异）。
> 收尾轮：M50 改为 `platforms: ["linux"]` 平台声明，非 Linux 记 `excluded` 而不是 survived；
> 目标用例被 SKIP 单列且不计检出；M49 锚点改为 projects ensure 命令上下文；runner 自测 8→12。

## 1. 交付物清单

| 路径 | 作用 |
| --- | --- |
| `tests/comprehensive-core.test.js` | 断言操作符边界 + 提取语义 + 造数 md5/signature（A1–A5，25 用例） |
| `tests/comprehensive-engine.test.js` | 引擎执行语义：重试/超时/取消/always/SKIP/上传下载/cookie/大小上限/模板/造数（B1–B8，26 用例） |
| `tests/comprehensive-cli.test.js` | CLI 集成：退出码、data/tags/bail/concurrency/suite、报告、脱敏、import、项目登记、serve×登记、插件闸门、--open（C1–C13，23 用例） |
| `tests/fixtures/comprehensive/test-service.mjs` | 本地确定性 HTTP 服务（无真实账号、无外网依赖、自动清理） |
| `tests/fixtures/comprehensive/cli-harness.mjs` | CLI 子进程夹具（隔离 `SCENARIO_TEST_HOME`、剥离宿主 `SCENARIO_*`、硬超时、`childEnv` 复用导出、`writeProject` 支持透传额外配置项） |
| `tests/mutation/mutations.mjs` | 50 个变异体定义（find/replace 强制「恰好 1 次」；含 G3/G4/G5/G7 新增 9 个；M50 声明 `platforms: ["linux"]`） |
| `tests/mutation/run-mutations.mjs` | 变异验证脚本 v3（隔离副本、baseline 先行、**仅断言失败算检出**、平台排除/SKIP 单列、诊断留痕、唯一收尾） |
| `tests/mutation/run-mutations.selftest.test.js` | 运行器故障路径自测（12 个用例，合成仓库 + 真实注入，含平台排除与 SKIP 不误判） |
| `tests/mutation/artifacts/latest.json` | 最近一次变异验证结果（已被 `.gitignore` 忽略，不入库） |

合计 **74 个测试用例**（A 25 + B 26 + C 23，其中 C13 仅 Linux 执行，其余平台显式 SKIP）。

## 2. 测试名 → 功能映射（供 docs/testing 覆盖矩阵对齐）

### A. 断言、提取与造数（`tests/comprehensive-core.test.js`，源文件 `src/core.js`）

A1–A4 与第一轮相同（比较符边界/隐式转换/组合证据/shape/extract 语义），新增：

| 测试名（前缀） | 覆盖功能 | 对齐缺口 |
| --- | --- | --- |
| `A5 md5：公开测试向量 + 与 Node crypto 独立对拍` | md5 公开向量（""/"abc"/"message digest"）+ 与 `node:crypto` 独立实现对拍（中文/长串）；非字符串按 `String()` 口径；小写 32 位十六进制 | **G3** |
| `A5 signature：按 key 排序拼装 apiSecret，输出大写 MD5` | 拼装口径（key 升序、`k=v` 用 `&` 连接、末尾 `apiSecret=<secret>`、MD5 大写）；null/undefined 拼空串、0/false 保留；空密钥；确定性；换密钥必变 | **G3** |
| `A5 generatedVars md5/signature：parts/params 引用 vars` | `parts`/`params` 取 vars 值；缺失变量拼空串；`secretVar` 指定密钥变量；同 runId 确定性；缺密钥（未声明/空串）快速失败且错误不回显密钥值；失败不写目标变量 | **G3** |

### B. 引擎执行语义（`tests/comprehensive-engine.test.js`）

B1–B7 与第一轮相同，新增：

| 测试名（前缀） | 覆盖功能 |
| --- | --- |
| `B8 generatedVars md5/signature 进入引擎 vars` | 造数值注入请求头可被观测；与 `node:crypto` 独立对拍；跨轮（新 runId）确定性；缺密钥使运行快速失败且不发请求 |

### C. CLI 集成（`tests/comprehensive-cli.test.js`）

C1–C10 与第一轮相同（C7 的 JUnit 断言已按「正确期望」修正，见 §5），新增：

| 测试名（前缀） | 覆盖功能 | 对齐缺口 |
| --- | --- | --- |
| `C11 serve×项目登记：缺省复用固定端口、显式 --port 更新登记、端口被占明确报错退出 1` | 首次分配写登记、二次启动「固定复用」同端口、`--port` 更新登记并复用、登记端口被占时报错+退出 1+给纠正途径（命令层集成，长驻子进程带兜底回收） | **G5** |
| `C11 projects ensure --reassign：端口被占时顺延空闲端口并更新登记` | 缺省不改登记且如实报告 `portAvailable=false`；`--reassign` 顺延到空闲端口并更新登记；顺延后成为新固定端口 | **G5** |
| `C12 --allow-external-plugins：默认拒绝目录外插件且零副作用；显式放行有告警且钩子真实生效` | 默认拒绝（退出 1、错误点名 flag、插件零执行、零请求）；放行时「加载外部插件」告警 + `transformScenario` 钩子产物经服务端 hits 观测 | **G4** |
| `C12 目录内插件无需 flag 即生效；钩子抛错时 CLI 以非零退出` | 目录内插件无告警且生效；钩子抛错 → 退出 1、错误可定位、无假绿进度 | **G4** |
| `C13 serve --open：经可注入 PATH 桩观测打开的 URL（仅 Linux）` | `--open` 打开的是工作台根地址且端口与监听端口一致；观测桩只记录参数，绝不启动真实浏览器；非 Linux 平台显式 SKIP 并说明原因 | **G7** |

## 3. 运行方式

```bash
# 只跑本次新增的专项（不跑完整 npm test）
node --test tests/comprehensive-core.test.js tests/comprehensive-engine.test.js tests/comprehensive-cli.test.js

# 单个文件 / 单个用例
node --test --test-name-pattern="C12" tests/comprehensive-cli.test.js

# 变异运行器自测（故障注入：合成仓库，秒级）
node --test tests/mutation/run-mutations.selftest.test.js

# 变异验证（npm run test:mutation = 自测 → 全量变异；隔离副本，绝不修改工作树）
node tests/mutation/run-mutations.mjs                 # 全部
node tests/mutation/run-mutations.mjs --only M42,M45  # 指定 id
node tests/mutation/run-mutations.mjs --keep          # 保留隔离副本便于排查
node tests/mutation/run-mutations.mjs --json          # 机器可读结果
```

资源清理：测试服务监听 `127.0.0.1:0`，`close()` 里 `closeAllConnections()` + `server.close()`；
serve 子进程逐个显式 stop，另有兜底回收（断言失败也必须停干净，见 §5 缺陷 F3）；
CLI 夹具用 `mkdtempSync` 建临时项目与 `SCENARIO_TEST_HOME`，`finally` 里 `rmSync(recursive)`；
变异副本建在 `os.tmpdir()`，结束即删（`--keep` 保留）。**没有真实账号、没有外网请求、没有共享全局状态。**

## 4. 变异验证：方法与结果

### 4.1 运行器 v3（本轮修复 + 加固 + 平台/SKIP 分类）

1. 复制 `src/` + `tests/comprehensive*.test.js` + `tests/fixtures/comprehensive/` 到 `os.tmpdir()` 下的隔离副本，**只在副本注入**，工作树 `src/` 全程只读；
2. 依赖装配显式化：优先 junction/dir 软链接回仓库 `node_modules`；失败则只复制运行时必需包（`blueimp-md5`）；再失败记为 `unavailable` 并写入报告 `dependencies` 字段——**依赖问题明确报 infra，不再用注释说「不依赖」**；
3. **先跑 baseline**：原始实现全部用例通过才算 baseline ok；**零用例不算通过**（防环境问题把 baseline 空跑成假绿）；不过 → 全部记为 `infrastructure-error`，`killed=0`；
4. 每个变异体 `find` 必须命中恰好 1 次；注入后 `node --check` 语法自检，失败记 `infrastructure-error`；
5. **判定收紧（本轮核心修复）**：目标用例由 pass 转 fail 时，必须 TAP 诊断里 `code=ERR_ASSERTION`（断言失败）才算 killed。超时、目标用例不存在、整套无用例级结果（文件级加载失败）、用例以非断言方式崩溃（TypeError/钩子异常，`code=ERR_TEST_FAILURE` 等）一律 `infrastructure-error`，**不能把「所有崩溃」泛化成检出**；
6. 每个变异体保存 `matchedCase`、`failureType`、`diagnostic`（error 块前 800 字符，超时保存输出尾部）、`exitCode`、`otherFailures`，供独立 QA 核对；目标用例不存在时 `matchedCase=null`（修复了此前 `target.name` 空引用崩溃）；
7. **唯一收尾**：`finish()` 只在 finally 执行一次（修复了 baseline 失败分支 double-finish 的二次清理/重复写报告）；
8. 自测支撑：`--repo-root`/`--mutations` 选项 + `NODE_TEST_CONTEXT` 剥离（自测嵌套在 `node --test` 里时孙进程会静默变成测试 worker、输出为空——那曾把 baseline 变成「0 用例也通过」的假绿）；
9. **平台门控与 SKIP 分类（收尾适配）**：变异体可用 `platforms` 声明适用平台（未声明 = 全平台）。当前平台不在声明内 → `excluded`（platform-not-applicable），显式给出原因，**不注入、不记 survived、不进得分分母**，也不参与 baseline；声明无效（空数组/未知平台名）一律 `infrastructure-error`，避免把配置错误伪装成「平台不适用」。TAP `# SKIP`/`# TODO` 的目标用例单列 `skipped`：**既不算 killed，也不算 equivalent/survived**，退出码非零提示「该变异未被实际验证」；平台不适用必须回到变异体声明 `platforms`，不能靠用例自行 skip 蒙混。

### 4.2 故障路径自测（`run-mutations.selftest.test.js`，12 用例全绿）

| 自测用例 | 验证点 |
| --- | --- |
| 正常路径：killed + 等价控制组 | 退出码 0、报告唯一完整、副本清理、diagnostic 保留期望/实际值 |
| 目标用例不存在 | `matchedCase=null`、infra、退出码 1、不因空引用崩溃 |
| 语法错误注入 | infra（原因可定位），副本已还原、后续变异仍能注入并 killed |
| baseline 失败 | 全部 infra、`killed=0`、**唯一报告**（回归 double-finish）、退出码 1 |
| 测试进程超时 | infra（不记为检出），退出码 1 |
| 测试文件加载失败 | infra 且原因可定位 |
| 非断言崩溃（TypeError） | `failureType=testCodeFailure`、诊断含 `push`、outcome=infra——崩溃≠检出 |
| 真实 survived | 退出码 1、`mutationScore=0` |
| 平台排除（声明不含当前平台） | `excluded`、`applicable=0`、`mutationScore=null`、不跑 baseline、退出码 0；不冒充 survived |
| 平台命中（声明含当前平台） | 照常注入并 killed——平台声明不得变成跳过 |
| 目标用例被 SKIP | `outcome=skipped`（expect=killed 与 expect=equivalent 两种声明都如此），不计 killed/equivalent/survived、退出码 1 |
| `platforms` 声明无效（空数组） | `infrastructure-error`，不静默排除、不冒充「平台不适用」 |

### 4.3 本轮新增变异体（G3/G4/G5/G7；M42–M49 定向 8/8 killed，M50 平台门控）

| id | 变异 | 目标用例 |
| --- | --- | --- |
| M42 | signature 去掉 `.toUpperCase()` | A5 signature |
| M43 | signature 去掉 `.sort()` | A5 signature |
| M44 | md5 造数改用变量名而非变量值 | A5 generatedVars |
| M45 | 外部插件闸门反向（默认放行） | C12 |
| M46 | 显式 `--port` 不写回登记 | C11 serve |
| M47 | reassign 顺延分支失效 | C11 ensure |
| M48 | serve 监听端口与登记端口漂移（+1） | C11 serve |
| M49 | projects ensure 忽略 `--reassign` 参数 | C11 ensure |
| M50 | `serve --open` 不再调用打开浏览器 | C13（**平台门控**：观测桩仅 Linux；变异体声明 `platforms: ["linux"]`，Windows/macOS 记为 `excluded` 平台不适用，**不计入 killed/survived/equivalent、不进本机得分分母**；CI mutation job 固定 Linux，必须实际检出） |

定向验证记录（`--only M42..M49`，Windows/Node 24）：`killed=7`（M42–M47、M49）→ 修复 C11 的子进程回收缺陷（见 §5 F3）后 M48 亦 `killed`，合计 **8/8 killed、survived=0、infra=0**。全量 50 个变异体按约定留待产品侧修复完成后由负责人统一串行复跑；上一轮 41 个变异体在本轮改动后的专项定向跑中没有失效（find 锚点仍唯一、目标用例名未变）。

收尾适配复跑（Windows/Node 24）：`--only M49` → `killed`（锚点已改为含 `if (sub === "ensure")` 命令上下文，serve 接入 `reassign` 后仍只命中 projects ensure 一处）；`--only M50` → `excluded`、退出码 0（平台不适用，不再冒充 survived）。50 个变异体的 find 锚点对当前源码做了全量静态核对，**均恰好命中 1 次**。

> 覆盖范围说明：50 个变异体仍是**有界选点**，不声称枚举变异空间。等价变异控制组仅 M15。

## 5. 本轮发现与处置（缺陷/现状）

### F1（原 G1，已澄清）：`--bail` 未执行场景已进 JUnit —— 是基线既有行为，不是待修缺陷

- 第一轮报告里 G1 写的是「src/cli.js 未把 notRun 传给 writeJUnitReport」。复核当前基线发现
  `writeJUnitReport(args.junit, safeReports, { notRun: ... })` **已接线**（`buildJUnitXml` 以
  `notrun#row-N` skipped testsuite 落盘），该缺陷描述过时。
- 处置：C7 用例原本断言 `tests="3"`（把「JUnit 漏未执行场景」当黄金快照锁死），已改为正确期望：
  `tests="4"` + `notrun#...` skipped suite + `--bail 后未执行` 原因可定位。若产品侧后续改 JUnit
  映射方式，此断言需要同步更新（这是正确的耦合，不是现状锁定）。

### F2（现状观察，待产品侧决策）：`serve --reassign` 被静默接受但不生效

- `--reassign` 在 contract.cli.options 中是全局 flag，`parseArgs` 对 serve 也会接受；
  但 `serveCommand` 调 `ensureProject` 时只传 `port`，**没有传 `reassign`**（README/契约描述里
  `--reassign` 也只声明给 `projects ensure`）。
- 影响：用户在登记端口被占时运行 `serve --reassign` 会得到端口占用报错，flag 被静默忽略——
  「被接受的选项不生效」比「未知参数直接拒绝」更容易误导。
- 我**没有**为它写正向测试（不发明输入规则），仅报出现状。产品侧二选一：
  a) serve 接线 `reassign: args.reassign === true` 并更新契约描述；b) serve 对 `--reassign`
  显式报「该选项不适用于 serve」。选定后可在 C11 增补对应用例。
- 收尾快照：负责人已按 a) 分派研发2 给 serve 接线；M49 的注入锚点已同时改为含
  `if (sub === "ensure")` 的命令上下文，避免 serve 的新接线在 `src/cli.js` 里造成第二次命中而拒绝注入。

### F3（测试夹具缺陷，已修）：writeProject 静默丢弃额外配置键 + 长驻子进程兜底回收

- `writeProject` 的解构无 rest，`nodePlugins` 这类额外键被静默丢弃——C12 首次跑成了「没配置插件
  也通过」的假绿。已改为 rest 透传。
- C11 首次实现里，`first` serve 实例在断言失败时没有被 stop，测试进程挂到超时——变异器把真实的
  「断言检出」判成了 infra（这正是分类器应当的行为，但也暴露了用例自身的清理缺陷）。已加兜底回收
  列表，任何失败路径都保证 stop。M48 随后正确 killed。

### G2（第一轮报告，保持不变）：请求体/请求头字面敏感值会进失败诊断

仍为现状可复现行为，未写成失败测试（等产品侧决定是否按头名/字段名收集字面值）。

## 6. 未验证 / 已知限制（如实列出）

1. **C13 `serve --open` 仅 Linux 执行**（Windows/macOS SKIP）：观测桩依赖 PATH 注入 `xdg-open`；
   Windows 的 `cmd /c start` 无等价可注入缝，不做假阳性覆盖。本轮全部验证在 Windows/Node 24 完成，
   C13 的实际执行证据要在 CI Linux job 里出（依赖 MausBot 统一跑全量时确认）。
2. **全量 50 个变异体未在本轮重跑**（按分工约定留待产品修复后统一串行执行）；已定向验证 M42–M49，收尾轮在最终源码上复核 M49（新锚点，killed）与 M50（excluded）。
3. 浏览器工作台执行调度、serve 代理安全矩阵、插件钩子全矩阵仍不在变异范围（同第一轮口径）。
4. `C5 --concurrency` 的并发证据用服务端在途峰值，在 CPU 严重饱和机器上理论可降到 1（未观测到）。
5. 造数用例的校验位用测试内独立实现复算；区划池/号段池只验证格式与校验位，不验证是否为当前有效区划。
6. M15 为等价变异体（脚本自检用），不计入变异得分；M50 声明 `platforms: ["linux"]`，非 Linux 平台记为 `excluded`（平台不适用），不进得分分母、不冒充 survived；其实际检出证据只能由 CI Linux mutation job 提供（本机 Windows 无法代为验证）。
7. `tests/mutation/artifacts/` 已由负责人加入 `.gitignore`；报告含绝对路径，不入库。

## 7. 给对齐的说明（给测试工程师 / 负责人）

- 测试名统一前缀：`A`=断言/提取/造数（core）、`B`=引擎执行语义、`C`=CLI 集成；
  新增组：A5（G3）、B8（G3）、C11（G5）、C12（G4）、C13（G7）。
- 每个用例的 oracle 都是「可独立观测的事实」：服务端 `hits`、登记文件/`projects list`、serve 日志行
  （端口来源标注）、插件 marker 文件、PATH 观测桩产物、`node:crypto` 独立对拍、退出码、落盘文件内容。
- 变异报告 schema 升到 v3：新增 `skipped`/`excluded` 两类判定、`summary.skipped`/`summary.excluded`/`summary.applicable`，每条结果新增 `platforms`/`skipped`；`mutationScore` 分母只含 killed+survived（平台排除与 SKIP 不进分母）；退出码问题项 = survived + skipped + infrastructure-error。下游按 `schemaVersion` 判断消费。
- `package.json` 的 `test:mutation` 改为「自测先行」：`node --test tests/mutation/run-mutations.selftest.test.js && node tests/mutation/run-mutations.mjs`；
  分类器回归会先在自测挡住，不会污染变异报告。
- 未包含任何行覆盖率门禁，未放宽既有测试阈值，未新增依赖（仅用 `node:test`/`node:assert`/内置模块）。

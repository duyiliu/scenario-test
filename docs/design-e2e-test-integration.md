# E2E 测试集成（确定性发布消费链）

> 设计审查：PASS
> 审查模式：same-context（独立上下文不可用——无 subagent 授权）
> 设计审查轮次：1/3
> 设计审查范围与结论：范围=设计全文 + src/cli.js ensureRuntimeFile/runtimeSourceCandidates/init 交互分支 + scripts/install.sh/install.ps1 下载-校验-init 链路 + run-tests.mjs glob + ci.yml。结论：无 Critical/High；3 项 Medium 已回填设计（SCENARIO_TEST_RELEASE_JSON 强制注入、manifest.version 按脚本钉版号生成、平台 skip 门控）；1 项脚本不对称（sh 可 env 覆盖版本/ps1 字面量）记入风险，不改脚本。
> 设计版本：v1
> 设计确认：待确认
> 设计确认依据：无
> 本文件只保存稳定设计基线；执行进度、实施清单、返工状态统一放同目录 `tasks.md`。

## 1. 背景与范围

### 背景

- 本仓库的分发模型是「GitHub Tag = 产物」：业务项目经 `scripts/install.sh` / `scripts/install.ps1` 按固定 Tag 从 jsDelivr 下载 `dist/` 4 个运行时文件，对 `skills/scenario-test/runtime/release.json` 的 SHA-256 校验后由 CLI `init` 落盘，最后 `doctor` 闸门。
- 现有测试金字塔：单元/集成（`tests/*.test.js`，CI ✅）、Playwright 工作台三层（CI ✅）、变异（CI ✅）。**真实消费链没有任何 CI 证据**：`init.test.js` 测的是 CLI init 函数与 mock 下载分支，`issue-120` 测校验逻辑，`skill-runtime.test.js` 测 Skill 离线 init——但两个安装脚本本体从未在 CI 被端到端执行；LLM 驱动的 `tests/skill-e2e/` 仅在 192.168.1.214 手动跑（coverage-matrix 记为缺口 G8「未验证」）。
- 同类项目参照（GitHub 调研结论）：tsz/slice/nub 等以独立 `install-test` workflow 在各 OS 上跑真实安装脚本；gh cli 用 `acceptance/` + build tag 把真机验收与单测隔离；gotit 对每个用例做 temp HOME/工作区隔离；yarnpkg e2e 直接「消费自家工具」做集成。共同模式：**E2E 在本仓、独立入口、真跑脚本、临时隔离、OS 矩阵**。

### 目标

- 新增确定性 E2E 层，验证「安装脚本 → 运行时下载 → SHA-256 校验 → init → doctor → run → 报告产物」全链，纳入 CI 作为 PR 门禁，闭合 G8 的确定性段。
- 双平台分发面同测：ubuntu 跑 `install.sh`，windows 跑 `install.ps1`（后者目前完全无执行证据）。
- 全程无外网、无 LLM、无 Docker；本地 `npm run test:e2e` 可跑。

### 非目标

- 不替代、不迁移 `tests/skill-e2e/` 的 LLM 接入-执行冒烟（仍在 214 手动；G8 只闭合确定性段，文档如实标注）。
- 不做工作台 UI 端到端：`browser-comprehensive` 已对 src+dist 双模式覆盖执行语义；init 产物的 `index.html` 只做文件级断言，不开 Playwright。
- 不做真实 jsDelivr/CDN 验证（属发布后验证，见 §5 非阻塞项）。
- 不改变安装脚本、init、doctor、CLI 的现有行为契约；E2E 只观测、不修补。

### 本次范围

- `tests/e2e/` 新目录：静态服务器（模拟 CDN）、业务 API 夹具、链路测试、README。
- `package.json` 增加 `test:e2e`；`scripts/run-e2e.mjs` 跨平台枚举入口（与 `run-tests.mjs` 同构）。
- `.github/workflows/ci.yml` 新增 `e2e` job。
- `docs/testing/coverage-matrix.md` 更新 G8 状态；`AGENTS.md`/`CLAUDE.md` 测试入口说明同步。

### 现有能力 / 可复用内容

- `install.sh` 支持第三参数/`SCENARIO_TEST_SOURCE` 自定义源 + `SCENARIO_TEST_RELEASE_JSON` 覆盖清单；`install.ps1` 支持 `-Source` + 同名环境变量——**无需改脚本即可指向本地模拟 CDN**。
- `tests/skill-e2e/java-springboot` 的接口契约（login/orders/鉴权 404）可直接作为 fixture API 的行为蓝本，便于未来 Docker 化时夹具对齐。
- `run-tests.mjs` 的「JS 枚举测试文件再传 node --test」模式解决 Windows glob 问题，e2e runner 照搬。
- init 产物布局、`FRAMEWORK_FILES`、版本锁、doctor 检查项已有单测口径，E2E 断言复用同一事实源（不新造清单）。

### 影响范围

- 新增文件为主；改动点：`package.json` scripts、`ci.yml` 增 job、文档三处。不动 `src/`、`scripts/install.*`、`dist/` 生成逻辑。

## 2. 设计

### 2.1 结构与链路

```
tests/e2e/
  README.md                 # 定位、运行方式、与 skill-e2e 的分工
  helpers/
    static-source.mjs       # 本地"CDN"：serve dist/ + 动态生成 release.json
    fixture-api.mjs         # 零依赖业务 API（login/users/orders，同 java 夹具契约）
    proc.mjs                # spawn 封装：超时、输出采集、平台脚本选择
  project/                  # 消费者工程夹具：场景文件（run 阶段拷入已初始化工程）
    scenarios/*.scenario.js
  install-chain.test.mjs    # 安装链正/反例
  run-chain.test.mjs        # 执行链正/反例
scripts/run-e2e.mjs         # 枚举 tests/e2e/*.test.mjs → node --test
```

链路时序（每个测试进程内）：

```
static-source (http://127.0.0.1:PORT/dist + /release.json)
        │  release.json = 对当前 checkout 构建出的 dist/ 4 文件实时算 SHA-256 生成；
        │  version 字段取「被执行安装脚本内钉死的版本」（sh 解析 SCENARIO_TEST_VERSION 默认值，
        │  ps1 解析 $ScenarioTestVersion 字面量），保证版本闸门的正向匹配
        ▼
mktemp 消费工程目录（os.tmpdir，全链只写临时区）
        │
        ▼ 平台分发：linux/macos → bash install.sh；windows → pwsh(优先)/powershell install.ps1
        │  两个脚本都必须显式注入 SCENARIO_TEST_RELEASE_JSON=http://127.0.0.1:PORT/release.json
        │  （sh 缺省时会"警告+跳过校验"，ps1 缺省时会先打真实 jsDelivr——不注入则
        │   SHA-256 闸门没被测到，甚至触网）
install（下载 → 清单校验 → CLI init → doctor → 文件清单自检）
        │  离线性机制（已核实 src/cli.js）：脚本把 4 个运行时文件下到临时目录并从该处
        │  执行 init；init 的 runtimeSourceCandidates 按「运行中 CLI 同目录 → ../dist」
        │  找副本，全部命中刚下载的文件 → 不回源、不触 jsDelivr
        ▼ 断言 exit 0、.scenario-test/ 4 运行时 + 版本锁、输出含"校验通过"、doctor PASS
拷贝 tests/e2e/project/ 场景文件进工程
        │
        ▼ node .scenario-test/scenario-test-cli.cjs run --config … --env local --all --json/--junit/--report
fixture-api（127.0.0.1 随机端口：login 200/401、users 鉴权、orders 建-查-删-404）
        │
        ▼ 断言 exit 0、JSON 全 passed、JUnit/XML/MD 产物存在
```

平台门控：每个用例按 `process.platform` 分发到对应安装脚本，非本平台的用例 `test.skip` 并明示原因；CI 矩阵保证每个脚本在其原生平台被执行，不产生"全平台 skip"的假绿。

### 2.2 高成本契约（不可随意变更）

- **黑盒边界**：E2E 只通过「子进程退出码 + 文件系统 + HTTP」断言，不 `import` `src/` 或 `dist/` 内部模块，不与被测物共享实现（防同向漂移造成双份假绿）。
- **被测产物来源**：必须是当前 checkout `npm run build` 的 `dist/`。CI 顺序固定 build → e2e；测试启动时 dist 缺失则明确报错，不在测试内重建。
- **清单动态生成**：`release.json` 由 static-source 对当前 dist 实时算哈希生成。committed `release.json` 是发布产物、开发期与 dist 存在合理时差（发布流程重算），**不得**被 E2E 当作新鲜度断言对象；E2E 验证的是"脚本的校验逻辑"，清单新鲜度归发布流程管。
- **隔离**：一切写入限 `os.tmpdir`；不得污染 git 工作区（与同流水线 dist 新鲜度闸门兼容）；进程级清理（退出杀 fixture/server/临时目录）。
- **确定性**：无外网（全走 127.0.0.1）、随机端口（listen 0）、单链有界超时（目标单 job ≤ ~3min）、无 LLM/Docker 依赖。
- **平台分发**：unix→`install.sh`（bash），windows→`install.ps1`（`pwsh` 优先、缺失回退 `powershell` 5.1）。脚本执行器选择是 E2E 自身的平台契约，新增平台需显式登记。

### 2.3 用例面（正反例）

install-chain：

- 正例：自定义源 + 清单校验 → init → doctor PASS（每平台一条）。
- 反例：服务端对被下载文件返回篡改字节 → SHA-256 校验失败、exit 非零、`scenario-test/` 不残留半成品（#120 闸门的端到端证据）。
- 反例：源不可达/404 → exit 非零且错误信息可定位。

run-chain（复用已初始化工程）：

- 正例：login→users→orders 建查删 全场景 PASS；`--json` stdout 可解析、`--junit`/`--report` 产物存在。
- 反例：注入一个断言失败场景 → exit 非零且 JSON 标注 failed（验证失败路径在真实工程里同样成立）。

### 2.4 CI 集成

- `package.json`：`"test:e2e": "node scripts/run-e2e.mjs"`；`check:all` 末尾追加 `npm run test:e2e`（本地全量门禁）。`test:unit`/`check` 不变。
- `ci.yml` 新增 `e2e` job：`matrix.os = [ubuntu-latest, windows-latest]`（macOS 见非阻塞项）、`node 22`；steps = checkout → setup-node → `npm ci` → `npm run build` → `npm run test:e2e`。与 unit/browser/mutation 并行，不阻塞其他 job。

## 3. 边界与风险

- **权限/安全边界**：fixture 与静态服务器只绑 127.0.0.1；临时工程不写入仓库；测试不接触真实凭据/生产地址（沿仓库既有约束）。
- **兼容性**：新文件均 LF（check:eol 兼容）；`tests/e2e/` 不匹配 `run-tests.mjs` 的 `tests/*.test.js` glob，不进 unit；PowerShell 5.1 宿主的 stderr 包装问题由 `install.ps1` 自身 `Invoke-NativeCapture` 兜底，E2E 侧靠退出码与输出断言。
- **主要风险**：① 安装脚本内 `mktemp`/路径在 Git Bash vs WSL 的差异（CI ubuntu 无此问题，本机跑 sh 路径非必需）；② windows runner 上 `pwsh` 可用性（GitHub 托管 runner 预装；本机无 pwsh 时回退 powershell）；③ 端口竞争——一律 listen 0；④ 已核实的脚本不对称——`install.sh` 支持 `SCENARIO_TEST_VERSION` env 覆盖版本，`install.ps1` 的 `$ScenarioTestVersion` 为字面量不可覆盖（E2E 按各脚本实际钉版号生成清单即可适配，不改脚本）。
- **不可逆点/回滚**：纯新增测试设施，回滚 = 删目录 + 撤 scripts/job 行，无迁移成本。

## 4. 验收与验证

| ID | 验收标准 | 验证方式 | 通过标准 |
|---|---|---|---|
| AC01 | ubuntu CI 上 `install.sh` 全链端到端通过 | ci.yml `e2e` job + `npm run test:e2e` | job 绿；断言覆盖下载/校验/init/doctor/文件清单 |
| AC02 | windows CI 上 `install.ps1` 同链通过 | 同上（windows-latest） | job 绿；同等断言面 |
| AC03 | 初始化工程内 `run` 对 fixture 全场景通过且产物齐 | run-chain 正例 | exit 0、JSON 全 passed、JUnit/MD 产物存在 |
| AC04 | 篡改产物被 SHA-256 校验真实拦截；失败场景链 exit 非零 | install/run 反例 | 两类负向用例均断言到预期退出码与错误语义 |
| AC05 | 测试确定性与隔离 | 代码审查 + 本地/CI 复跑 | 无外网调用；`git status` 干净；e2e job 增量耗时 ≤ ~3min |
| AC06 | G8 状态与文档如实更新 | 审查 docs/testing/coverage-matrix.md、AGENTS/CLAUDE | G8 标注「确定性段已进 CI；LLM 段仍远程手动」，无夸大 |

## 5. 确认项

### 阻塞确认项

- 无

### 非阻塞待确认项

- macOS runner（`macos-latest`）是否纳入 e2e 矩阵：`install.sh` 同样适用，成本低建议加；本次可先 ubuntu+windows，macOS 作为增量。
- Node 24 是否进 e2e 矩阵：unit 已覆盖双版本，e2e 单版本即可，建议不加。
- Windows PowerShell 5.1 宿主是否单列一条用例：默认 `pwsh` 优先回退 `powershell`，若回退被执行即为有效覆盖，不单列。
- 发布后验证（L4）：`on: release published` 对真实 jsDelivr 跑双安装脚本（带 CDN 传播重试），仅产出证据不阻塞发布；建议作为后续增量单独 workflow，本次不实现。

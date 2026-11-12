# E2E 策略与目录设计

> 本文档是浏览器 E2E 能力的定位、目录、场景组织与实现差距的**设计基线**。
> 结论来自 2026-06 的定位讨论：E2E 与 HTTP 场景同属"AI 写、人审"的验收执行层，
> 面向开发过程而非测试团队。改目录结构、命名或模式语义前先改这里。

## 1. 定位与非目标

**定位**：AI 辅助开发过程中的确定性验收执行层。AI 按 contract/capabilities 生成用例，
人审证据；HTTP 场景与浏览器 E2E 是两种执行器，共用一份环境配置、一套证据形态。

**非目标**（显式声明，防止需求拉偏）：

- 不做用例管理、覆盖矩阵、执行计划、批次调度；
- 不做权限、多租户、服务端持久化；
- 不做结果趋势库（`e2e-results/` 是本地证据，不是数据库）；
- 不替代测试团队的手工探索与验收判断；
- 不做"一条用例里既发请求又点页面"的混合 DSL，两层协作点是数据，不是执行器。

## 2. 仓库形态矩阵：目录归属

| 仓库形态 | HTTP 场景放哪 | E2E 放哪 | owner |
| --- | --- | --- | --- |
| 纯后端 | `<repo>/scenario-test/` | 不启用 | 后端模块 owner |
| 纯前端 + 独立后端 | 少量（调后端 API 造数） | 前端仓自己的 e2e 目录 | 前端 owner |
| 混合仓（前后端同仓） | `scenario-test/scenarios/` | `web/e2e/`（就近前端） | HTTP 归后端，E2E 归前端 |
| 前后端分仓 | 后端仓 | 前端仓，baseURL 指已部署环境 | 各仓 owner |
| 微服务多仓 | 发起方服务仓 | BFF/前端仓 | 发起方 owner |
| 第三方/客户环境（无代码） | 独立验收目录 | 独立验收目录，只做冒烟 | 实施/交付 |

一句话：**接口场景跟接口代码走，E2E 跟页面代码走，跨系统的只做冒烟。**

混合仓唯一真正的风险是 owner 缺位：接入时必须显式指定 HTTP 与 E2E 的 owner，
否则页面一改全红、被沉默 skip，E2E 就死了。

## 3. 三个不变式（实现的地基）

1. **产物永远归 workspace 所有**：`e2e-results/` 固定在 `<scenario-test>/e2e-results/`，
   无论 e2e 代码在哪。证据不散落，`.gitignore` 只维护一处。
2. **reporter 由运行时注入，不落项目**：serve 启动 playwright 时经
   `SCENARIO_TEST_E2E_REPORTER` 注入物化路径（v23 起物化到
   `e2e-results/.scenario-test-e2e-reporter.cjs`，该目录随产物一起 gitignore），
   托管模板的 playwright.config 仅在环境变量存在时追加 reporter；
   项目内不再维护 `.scenario-test/` 副本。
3. **挂载目录严格只读**：mounted 模式不对 e2e root 写任何文件——不改对方
   `playwright.config.js`、不塞 marker、不动 `.gitignore`。

## 4. 两种模式与解析规则

```
M1 托管（managed）： <scenario-test>/e2e/     marker: e2e/package.json 的 scenarioTestE2e: true
M2 挂载（mounted）： 项目内任意目录            依据: config 声明 + 该目录有 playwright.config.*
```

解析优先级：CLI `--e2e-root` > `scenario.config.js` 的 `e2e.root` > 默认探测 `<scenario-test>/e2e`。

```js
// scenario.config.js 新增键（新增时递增 contractVersion）
e2e: {
  root: "web/e2e",     // 相对 scenario-test 目录；默认 "./e2e"
  baseUrl: 可选,        // 缺省回落当前 env 的 baseUrl（后端同源托管前端时天然一致）
  channel: 可选         // 缺省回落 E2E_BROWSER_CHANNEL
}
```

baseUrl 回落规则是单一来源的关键：混合仓里 HTTP env 和 E2E 共用一个地址，不抄两遍。

**mounted 的 reporter 注入**：不改对方 config，extension spawn 时追加 CLI `--reporter`。
面板触发的运行归我们管；对方自己的 `npm test` 完全不受影响。

**init 语义**：

- 目标不存在 → 写托管模板；
- 目标存在且有 `playwright.config.*` → 自动转挂载，只在 config 里声明 root，
  不向前端目录写任何文件（reporter 由 env 注入，无需落盘）；
- `init --e2e --e2e-dir <路径>` 支持就近前端新建。

**安全边界**（复用现有机制）：

- e2e root 必须 `isRealPathWithinRoot(projectRoot, root)`，symlink 越界拒绝；
- spec 枚举、artifact 读取限定在 root / resultsDir 内；
- mounted 模式无写入路径。

## 5. 目录与命名规范（定稿，发布后不再动摇）

| 东西 | 名字 | 说明 |
| --- | --- | --- |
| 托管默认 | `scenario-test/e2e/` | 唯一新建的默认位置 |
| 就近前端（托管新建） | `web/e2e/` | 仍叫 e2e，marker + 目录内 README 标明归 scenario-test 管 |
| 挂载已有 | 前端自己定 | 我们只读，无权命名 |
| 结果 | `scenario-test/e2e-results/` | 永远归 workspace，不跟 e2e root 走 |
| 公共 reporter | `SCENARIO_TEST_E2E_REPORTER` env → `e2e-results/.scenario-test-e2e-reporter.cjs` | 运行时物化，不落项目 |

不改名为 `scenario-e2e` 的理由：`e2e` 是前端生态通用词（Playwright 官方与社区惯例），
`scenario-test/e2e/` 已带命名空间；场景语义由内层结构表达；所有权混淆用
marker + README + 面板徽标解决，不用名字解决。

命名定稿时机：E2E 尚未随任何 Tag 发布，当前是改名零成本窗口——结论是**不改**，此后不再动摇。

托管模板内层结构：

```
e2e/
  playwright.config.js
  auth-adapter.js        # 登录走 API 注入，不点 UI
  fixtures/              # 造数/清理，按功能命名（fixtures/订单创建.js），走接口
  tests/<功能>/<场景>.spec.js
```

## 6. 场景组织：两层同构

E2E 与 HTTP 场景共用同一套方法论（功能卡片 → 场景矩阵 → 一条场景一条独立验证路径）：

| 概念 | HTTP 场景 | 浏览器 E2E |
| --- | --- | --- |
| 业务功能（目录） | `scenarios/订单创建/*.js` | `tests/订单创建/*.spec.js` |
| 场景（文件） | 一个 `defineScenario` | 一个 `.spec.js` |
| 步骤 | step | `test.step` |
| 断言 | assertions | `expect` |
| 证据 | manifest + 脱敏响应 | manifest + 截图 |

**一场景一文件**：面板是文件级触发，文件级即场景级，"改完顺手验一条"不需要跑整个功能，
也无需开发面板单测选择。功能名是两层之间的 join key，可按功能查看覆盖分布。

**同一功能两层分配规则**（防重复，先出一份矩阵再分配）：

| 场景类型 | 放哪 | 理由 |
| --- | --- | --- |
| 校验规则、错误码、权限拒绝、状态流转 | HTTP 层 | 毫秒级、每提交跑 |
| 主流程用户路径 | E2E | 只有浏览器能证明"用户真的能用" |
| 多页联动、离开保护、上传、防重复点击 | E2E | 交互语义，接口层测不到 |
| 空态/异常态展示 | 两层各一条 | HTTP 断言结构，E2E 断言展示 |

E2E 场景数应比 HTTP 少一个量级。AI 生成 E2E 前先查同功能 HTTP 侧已有场景，
规则类不再重复建（此流程需补进 `skills/scenario-test/references/e2e.md`）。

## 7. 分层执行与触发

| 层 | 内容 | 频率 | 预算 |
| --- | --- | --- | --- |
| L1 接口场景 | 契约、业务规则、权限、状态流转 | 每次提交/PR | < 1 min |
| L2 冒烟 E2E | 登录、主列表、主流程 3~5 条 | 合并前 / 每日 | < 3 min |
| L3 回归 E2E | 关键路径全量 | 每日 / 发版前 | < 15 min |
| 手工探索 | 新功能、异常路径、体验 | 按需 | — |

原则：能放 L1 的不放 L3；L2 红必须当天处理。

## 8. 环境与数据

- 单一来源：`scenario.config.js` 的 environments 派生 HTTP baseUrl 与 E2E `E2E_BASE_URL`；
- 造数走接口：E2E 前置数据用 API（`request` fixture / `global-setup`）创建与清理；
- 数据隔离：每次运行带 runId 前缀唯一标识，断言用"包含本次标识"而非"等于总数"；
- 环境禁用表：生产环境禁止写入类场景与 E2E，配置显式声明，不靠自觉。

凭据：只从环境变量/凭据提供器读取；登录走 API 注入（auth-adapter），不在 UI 点登录；
SSO 用测试客户端或预置 storageState；验证码用测试环境固定码或接口绕过；
多角色每角色独立 context，不共享登录态。

## 9. 失败治理

- 红必处理：48 小时不修则删除或挂起用例单，禁止沉默 `test.skip`；
- flaky 判定：同一用例连续 3 次结果不一致即标记，归因等待策略（轮询，禁止 sleep）；
- 证据包：`e2e-results/<runId>/`（manifest + 截图 + trace + HTML）打包即可提缺陷；
  对外导出 junit / json 接任何平台。

## 10. 实现差距与改造清单

| 差距 | 现状 | 改造 | 优先级 |
| --- | --- | --- | --- |
| 只认自家 e2e 目录 | `isE2eProject()` 只认 marker；init 遇已有目录抛错（`src/cli.js` initCommand） | `resolveE2eWorkspace(workspace, config)`；init 自动转挂载 | **P0** |
| reporter 相对定位 | 模板用 `__dirname` 推导 e2e/results 路径 | 改读 env：`E2E_RESULTS_DIR` / `E2E_E2E_ROOT`，spawn 时注入 | **P0** |
| 环境两处配置 | HTTP 走 config，E2E 走环境变量 | config `e2e` 键 + baseUrl/channel 回落规则 | **P0** |
| 接入步数过多 | init → npm install → 两个环境变量 → serve | init 自动装依赖或 doctor 给可粘贴命令 | P1 |
| 失败信息不可读 | 英文 Playwright 断言错误 | 映射"第 N 步 期望 X 实际 Y" | P1 |
| 证据不可移植 | 本地 manifest + 截图 | 一键导出 zip / junit | P1 |
| AI 不知道前端在哪 | skill 无前端入口概念 | 探测三档：同仓路径 / 分仓路径 / 仅 URL（标注稳定性低） | P1 |
| E2E 编写指引缺场景流程 | references/e2e.md 只有工程约束 | 补功能卡片 → 场景矩阵流程与两层分配规则 | P1 |
| 一仓多前端 | 单 root | schema 预留 `e2e.roots` 数组扩展 | P2 |
| 混合用例（API+UI 同链路） | 不支持 | **不做**，靠数据准备打通 | — |

P0 完成后随版本发布（E2E 与报告导出目前仅在 master，已安装 Skill 的 v0.15.0 运行时不包含）。

## 11. 度量

1. 新项目从零到第一条场景通过：命令数、分钟数；
2. AI 首次生成场景一次通过率（含 doctor 拦截率）；
3. E2E 红转绿平均时长（衡量治理，不是衡量工具）；
4. flaky 率（连续 3 次不一致的用例占比）。

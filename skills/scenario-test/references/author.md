# 生成与维护业务场景

仅在 `status=installed` 且项目文件可读时进入。日常使用**不再安装、不自动升级**。遇到版本锁或文件异常时先诊断。

1. 读取安装方的 `AI_SCENARIO_PROMPT.md`、`SCENARIO_PATTERNS.md`、`scenario-test-capabilities.json`（探测结果 `authoringPrompt`/`patterns`/`capabilities` 即其路径，均指向用户级运行时目录 `~/.scenario-test/runtime/<版本>/`），再读当前项目的 `scenario.config.js` 与已有场景；不要使用别的项目的规则。能力有疑问时执行 `node <cli> capabilities --json`。
2. 只定位本次业务目标涉及的 Controller、OpenAPI、前端 API、接口文档与已有测试。有功能名称和入口就直接工作；缺少依据时询问**最小**的必要信息。不遍历整个业务仓库。**若目标功能有可读后端源码，按需读取同目录的 [backend.md](backend.md)，先提取直接相关的调用链、业务规则与源码证据；没有后端源码时跳过。**
3. 先按项目内 AI 规则得到功能卡片与场景矩阵；将 backend.md 中已确认且能够通过 HTTP 观察的关键规则纳入候选场景。内部实现细节或无法通过 HTTP 稳定验证的风险，不强行转成 HTTP 场景。再对每条候选行为决策：

   | 决策 | 判据 |
   | --- | --- |
   | 复用 | 已有场景已触发该条件，且断言能证明业务结果（含跨接口链路） |
   | 增强 | 已触发条件但断言不足 → 在原场景补断言，不新建等价场景、不改已有 ID |
   | 新建 | 独立且重要的行为，已有场景没有可信验证 |
   | 暂不创建 | 与已有等价，或纯技术分支（日志/缓存/内部实现） |
   | 待确认 | 响应码/字段/数据准备查不到证据。先检索统一响应、全局异常处理与依赖约定，仍查不到才列，且不为它创建场景 |

4. **三条硬约束**：
   - 期望的错误响应必须来自全局异常处理或统一响应结构，禁止写死猜测的 `status: 500`、错误码或字段名。
   - 拒绝、重复提交、状态变更被拒的场景，必须有一个后续查询证明库里没有多余记录、或状态保持原值。
   - 源码确认的关键规则（状态前置条件、幂等、上下限）都必须在矩阵里出现，不得静默略过。

5. 用项目支持的 DSL 编排独立场景，数据隔离、清理精确；不修改业务代码、公共运行时或项目依赖。
6. 静态检查所改文件；需要时运行 `doctor`（不调用业务 HTTP），但**不要**擅自执行 `run`、`serve` 或调用业务接口。
7. 输出场景矩阵、修改文件与待确认项。用户要求执行时才切换到 `execute.md`。

## 造数片段（generatedVars）

测试造数统一声明在场景顶层 `generatedVars`，用 `{{vars.<name>}}` 在步骤中引用；证件/号码/枚举类按 runId+变量名确定性派生（轮内稳定、跨轮换号），不要写死固定号码撞唯一约束。语义与参数校验以 `AI_SCENARIO_PROMPT.md`、`SCENARIO_PATTERNS.md` 为准，这里只给可复制骨架：

```js
generatedVars: [
    { name: "idNo", type: "idcard", birthDate: "1990-06-15", gender: "FEMALE" },
    { name: "mobile", type: "phone", prefix: "138" },
    { name: "cardNo", type: "luhn", length: 16, prefix: "62" },
    { name: "corpCode", type: "uscc", regionCode: "110100" },
    { name: "orderId", type: "uuid" },            // 32 位无连字符用 uuidHex
    { name: "expireAt", type: "timestamp", offset: "+30d", unit: "s" }, // 偏移 ms/s/m/h/d/w
    { name: "signTime", type: "timestamp", offset: "-1h", format: "YYYY-MM-DD HH:mm:ss" }, // 与 unit 互斥
    { name: "channel", type: "enum", values: ["APP", "WEB"], weights: [3, 1] } // 缺省等权，权重 0 永不选中
]
```

`idcard` 必填 `birthDate`（YYYY-MM-DD）、可选 `gender`（MALE/FEMALE，默认 MALE）与 `regionCode`（6 位，缺省按轮次派生）；`luhn` 可选 `length`（12-19，默认 16）与 `prefix`（默认 62）；`phone` 可选 `prefix`（1[3-9] 三位号段）；`uscc` 可选 `regionCode`（默认 110100）。`timestamp` 的 `unit` 仅 ms（默认）/s。枚举候选与字段名必须有项目证据（同第 2、4 条）。

安装方的 `AI_SCENARIO_PROMPT.md` 优先于本文件对 DSL 细节的描述；这里是全局工作流，不是 DSL 的第二份事实来源。

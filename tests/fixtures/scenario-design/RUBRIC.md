# order-adjust 评分标准

评分输入是 AI 产出的 `scenario-test/` 目录，输出见 `score.mjs`。

## 规则与期望决策

| 规则 | 内容 | 证据位置 | 期望 |
| --- | --- | --- | --- |
| R1 | 创建成功：`code=0`、`data.status=PENDING`、可查询到 | `OrderAdjustService#create`；`docs/API.md` | 新建或增强，断言业务字段 |
| R2 | 数量超可调上限 → `40901`，**且未落单** | `OrderAdjustService#doCreate`（校验在 save 前）；`ErrorCode` | 新建，后置用列表查询证明 `total=0` |
| R3 | 同 `requestId` 重复提交 → 返回首条，不产生第二条 | `OrderAdjustService#create` 幂等分支；`OrderAdjustRepository#findByRequestId` | 新建，需两次提交 + ID 一致性或 `total=1` |
| R4 | 非 `PENDING` 再审批 → `40903`，状态保持 | `OrderAdjustService#approve` | 新建，需先审批成功再重复审批 |
| R5 | 调整后结算金额重算 | `SettlementClient`（外部依赖，本地不可达） | **允许标待确认**，不得编造金额断言 |
| R6 | 数量 `<= 0` → `40001` | `OrderAdjustRequest` `@Min(1)`；`ErrorCode` | 新建；`0` / `-1` / `-10` 等价，只测一个 |

`0`、`-1`、`-10` 触发同一条规则、同一个错误码，拆成多个场景属于冗余。

## 关键陷阱

**所有响应 HTTP 状态码都是 200**，失败只体现在 `code`。因此：

- 只写 `status: 200` 的场景对任何结果都恒真，属于假绿；
- 写 `status: 400` / `status: 500` 属于契约误读——源码与文档三处一致写明 200。

## 评分维度

| 维度 | 权重 | 判定 |
| --- | --- | --- |
| 规则覆盖 | 50 | 按 must 规则均分，覆盖一条得一份 |
| 断言有效性 | 25 | 命中的步骤必须断言期望结果（拒绝类精确错误码，成功类业务字段） |
| 后置状态验证 | 15 | 写操作之后需有查询步骤证明副作用（`postcheckPaths`） |
| 卫生项 | 10 | 基线场景 ID 保留、无契约误读、无等价重复场景 |

总分 100。**不要只看总分**：`findings` 会逐条说明哪条规则缺什么证据。

## 冗余判定

- 同一规则被 2 个以上**新建**场景覆盖 → 每个多余场景记 `redundant-scenario`。
- 基线场景已触达某条规则，但 AI 另外新建等价场景而不增强基线 → 记 `should-augment-baseline`。
- 同一规则被一个场景覆盖、且该场景同时验证另一条规则的不同结果 → **不算**冗余。

## 不看总分时要看什么

对每条规则，`findings` 中的 `decision` 应能回答：这条规则凭什么被验证、断言的字段是否真的证明业务结果、失败请求是否证明了没有副作用。

# 场景设计质量评估（issue #107）

衡量 `skills/scenario-test` 生成的场景**设计质量**：是否覆盖了关键业务规则、断言是否证明了业务结果、是否重复新建了等价场景。

与 `tests/skill-e2e/` 的区别：那里验证「接入 + 执行」链路（启动真实服务跑通场景），这里只验证「设计」——不启动服务、不调用接口，纯静态评分。

## 为什么需要它

改动 Skill 规则后，如果只凭「规则写得更清楚了」就认为有改进，等于没有证据。做过几轮复测后发现基线自身的产出波动就很大：同一输入可能生成 1 个场景，也可能生成 8 个。没有固定考卷时，任何单轮对比都分不清是规则有效还是运气。

夹具的作用就是把「考题」固定下来：同样的业务代码、同样的已有场景、同样的 prompt、机器打分。

## 目录

```
scenario-design/
├── order-adjust/       考题：一个可运行的 Spring Boot 业务项目 + 预置弱场景
├── case.json           标准 eval case：prompt、必须覆盖的规则、必须杀死的变异
├── prompt.md           给 AI 的任务描述（只给功能名，不给规则清单）
├── rubric.json         结构评分口径：规则 → 触发条件 → 期望结果
├── RUBRIC.md           人读评分说明
├── mutations.json      业务变异定义（M1-M4）
├── score.mjs           结构评分器（辅助信号）
├── mutation-check.mjs  变异测试（确定性硬门槛）
├── compare.mjs         两份产出匿名盲评（语义层）
├── summarize.mjs       多轮结果汇总
├── run-ab.sh           Docker 内跑一轮并评分
├── run-ab-local.mjs    本地裸跑（Linux 可用；Windows 上 pi 无 TTY 会卡住）
├── run-batch.sh        连续跑多轮（按 tag 前缀分组）
└── artifacts/          运行产物（不入库）
```

`order-adjust/` 是可编译运行的 Spring Boot 项目（`mvn package` + `java -jar`），
这是变异测试的前提：只有能起服务，才能验证「业务被改坏后场景会不会失败」。

## 快速验证评分器

不跑模型也能确认评分器工作正常：

```bash
node --test tests/score-design-eval.test.js
```

它用三份人工产出（理想 / 弱断言 / 改写基线 ID）验证区分度。

对预置的弱断言基线打分：

```bash
node tests/fixtures/scenario-design/score.mjs --artifact tests/fixtures/scenario-design/order-adjust
```

预期总分约 10（只有卫生分）——因为那条预置场景只断言 `status: 200`，而本项目所有响应都是 200，这个断言恒真。

## 三层评估

社区共识是「确定性检查优先，LLM judge 其次」。这里按这个顺序分三层：

| 层 | 工具 | 回答的问题 | 是否作为通过线 |
| --- | --- | --- | --- |
| **确定性** | `mutation-check.mjs` | 业务逻辑被改坏时，这组场景会不会失败 | **是** |
| 结构 | `score.mjs` | 规则覆盖、断言形态、场景冗余、`manual` 遗漏 | 否，辅助信号 |
| 语义 | `compare.mjs` | 两份产出哪份更能发现业务回归（盲评） | 否，参考 |

### 1. 变异测试（硬门槛）

```bash
node tests/fixtures/scenario-design/mutation-check.mjs --artifact artifacts/current-1/scenario-test
```

流程：注入变异 → `mvn package` → 起服务 → 跑场景 → 记录是否失败 → 恢复代码并重建。

```json
{
  "killed": 3,
  "total": 4,
  "required": { "total": 3, "killed": 3, "passed": true },
  "results": [
    { "id": "M3-invalid-quantity-writes-first", "killed": true }
  ]
}
```

- `manual: true` 的场景默认套件不执行，变异测试会逐个单独跑它们（每个场景前重启服务）
- `case.json` 的 `knownGaps` 是当前已知能力缺口，不计入通过线但要显式报告

**当前基线（v0.11.1 与工作区两版）**：M1-M4 全部被杀死 —— 两版生成的场景都能发现对应的业务缺陷。

**等价变异的陷阱**：M3 最初只把 Service 的校验移到落单之后，看起来是个缺陷，但 `OrderAdjustRequest`
上的 `@Min(1)` 会先拦住请求，Service 根本执行不到 —— 代码变了、行为没变，四个产物全部「存活」。
修正为「同时移除 Bean Validation」后，两版立刻都杀死了它。**新增变异时必须先确认它真的改变了可观测行为**，
否则会把等价变异误判成场景缺陷。

### 2. 结构评分（辅助）

```bash
node tests/fixtures/scenario-design/score.mjs --artifact artifacts/current-1/scenario-test
```

它只看静态文本：断言是否指向业务字段、有没有后置查询、场景 ID 是否保留。
**不能判断断言在业务被改坏时会不会失败** —— 变异测试实测证明，它会给 baseline 的 R2 判「无后置」，
但 baseline 实际能杀死 M4。把它当趋势信号，不要当结论。

### 3. 语义盲评（参考）

```bash
node tests/fixtures/scenario-design/compare.mjs --a artifacts/baseline-1/scenario-test --b artifacts/current-1/scenario-test
```

两份产出匿名化为 A/B（随机交换），让模型只回答「哪份更可能触发失败」，并要求指出各自最弱的一处验证。
用过的一轮里，盲评指出「A 的数量非正数场景只断言 code=0，可能漏 M3」。这个判断**后来被变异测试推翻**：
修正 M3 的等价变异问题后，该场景能够杀死它。所以盲评只作为线索来源，不能当作结论。

## A/B 流程

在 **192.168.1.214** 上执行（Windows 工作机没有 Docker daemon，详见 `AGENTS.md` 的「隔离验证环境」）。该机已配置 pi 凭据，并有预建镜像 `scenario-test-pi:1.4.0-node22`。

```bash
ssh root@192.168.1.214
cd /root/git/scenario-test && git pull && npm ci && npm run build

# 1. 拿一个旧版本 skill 作为基线（#107 的规则改动合入前用 v0.11.1，合入后用 v0.12.1）
git worktree add /tmp/st-baseline v0.11.1

# 2. 各跑 N 轮（建议 ≥ 6）；run-batch.sh 逐轮调用 run-ab.sh
SKILL_DIR=/tmp/st-baseline/skills/scenario-test PI_IMAGE=scenario-test-pi:1.4.0-node22 \
  bash tests/fixtures/scenario-design/run-batch.sh baseline 1 6
PI_IMAGE=scenario-test-pi:1.4.0-node22 bash tests/fixtures/scenario-design/run-batch.sh current 1 6

# 3. 汇总分布
node tests/fixtures/scenario-design/summarize.mjs tests/fixtures/scenario-design/artifacts
```

`PI_IMAGE` 缺省为 `pi-agent:1.4.0`（本地 build）；在 214 上显式指定预建镜像可跳过构建。
`MODEL` 缺省为 `deepseek-v4.1-flash`，但同名模型在多个 provider 下存在时 pi 会报歧义，此时写成 `provider/model`（214 上已认证的 provider 是 `new-api`）。
`summarize.mjs` 按 tag 前缀（`-` 之前）分组，输出总分分布与每条规则的有效覆盖次数。

## 怎么读结果

**只看分布，不看单轮。** 如果 baseline 的 min/max 跨度本身就很大，说明该任务对模型不收敛，任何小于 5 轮的对比都不可信。

`report.json` 里每条规则有：

- `decision`：新建 / 增强 / 弱断言 / 未覆盖
- `scenarioId`：由哪个场景验证
- `findings`：缺什么证据（精确错误码、后置验证、重复提交一致性）

卫生项会单独列出：改写基线 ID、猜测不存在的错误码、把 HTTP 200 写成 400/500、同一规则被多个新建场景重复验证。

## 仍然测不到的部分

- **「待确认」的质量**：AI 是否正确识别证据不足、是否在待确认前做了检索。这些在回复文本里，不在场景文件里，只能人工读。
- **多轮对话式的语义误读**：例如把「调整数量」理解成「调整金额」。盲评能提示，但没有确定性结论。
- **变异集的完备性**：M1-M4 只覆盖当前的 6 条规则。新增规则要同步补变异，否则「杀死率」会虚高。

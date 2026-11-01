# 场景设计质量评估（issue #107）

衡量 `skills/scenario-test` 生成的场景**设计质量**：是否覆盖了关键业务规则、断言是否证明了业务结果、是否重复新建了等价场景。

与 `tests/skill-e2e/` 的区别：那里验证「接入 + 执行」链路（启动真实服务跑通场景），这里只验证「设计」——不启动服务、不调用接口，纯静态评分。

## 为什么需要它

改动 Skill 规则后，如果只凭「规则写得更清楚了」就认为有改进，等于没有证据。做过几轮复测后发现基线自身的产出波动就很大：同一输入可能生成 1 个场景，也可能生成 8 个。没有固定考卷时，任何单轮对比都分不清是规则有效还是运气。

夹具的作用就是把「考题」固定下来：同样的业务代码、同样的已有场景、同样的 prompt、机器打分。

## 目录

```
scenario-design/
├── order-adjust/       考题：一个 Spring Boot 业务项目 + 预置弱场景
├── rubric.json         机器可读评分口径：规则 → 触发条件 → 期望结果
├── RUBRIC.md           人读评分说明
├── score.mjs           评分器
├── summarize.mjs       多轮结果汇总
├── prompt.md           给 AI 的任务描述（只给功能名，不给规则清单）
├── run-ab.sh           Docker 内跑一轮并评分
└── artifacts/          运行产物（不入库）
```

`order-adjust/` 的 Java 代码**不需要能编译运行**。Skill 的编写阶段本来就禁止调用 HTTP，评分只读 DSL 与源码，所以不需要 maven、端口或容器。

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

## A/B 流程

在 **192.168.1.214** 上执行（Windows 工作机没有 Docker daemon，详见 `AGENTS.md` 的「隔离验证环境」）。该机已配置 pi 凭据，并有预建镜像 `scenario-test-pi:1.4.0-node22`。

```bash
ssh root@192.168.1.214
cd /root/git/scenario-test && git pull && npm ci && npm run build

# 1. 拿一个旧版本 skill 作为基线
git worktree add /tmp/st-baseline v0.12.1

# 2. 各跑 N 轮（建议 ≥ 6）
for i in 1 2 3 4 5 6; do
  SKILL_DIR=/tmp/st-baseline/skills/scenario-test PI_IMAGE=scenario-test-pi:1.4.0-node22 \
    bash tests/fixtures/scenario-design/run-ab.sh --tag baseline-$i
done
for i in 1 2 3 4 5 6; do
  PI_IMAGE=scenario-test-pi:1.4.0-node22 bash tests/fixtures/scenario-design/run-ab.sh --tag current-$i
done

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

## 评分器测不到的部分

- **「待确认」的质量**：AI 是否正确识别了证据不足、是否在待确认前做了检索。这些在回复文本里，不在场景文件里，目前只能人工读。
- **规则理解是否正确**：例如把「调整数量」理解成「调整金额」。断言能对上错误码，但语义可能错。
- **执行可行性**：评分不验证场景能否真的跑通，那是 `tests/skill-e2e/` 的职责。

所以低分一定有问题，高分不代表完美。

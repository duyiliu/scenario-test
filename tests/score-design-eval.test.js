import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

// Issue #107 配套：场景设计评分器自身的区分度自测。
//
// 评分器如果对「理想产出」「弱断言产出」「改写 ID 的产出」给出相近分数，
// 它就不能用来判断 Skill 改动是否有效。这里用三份人工产出锁定区分度。

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scoreScript = path.join(root, "tests", "fixtures", "scenario-design", "score.mjs");

function writeArtifact(scenarios, extraVars = {}) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-design-eval-"));
    const projectDir = path.join(dir, "scenario-test");
    fs.mkdirSync(path.join(projectDir, "scenarios"), { recursive: true });
    const entries = scenarios
        .map((scenario) => `        { id: ${JSON.stringify(scenario.id)}, name: ${JSON.stringify(scenario.id)}, url: "scenarios/${scenario.id}.js" }`)
        .join(",\n");
    fs.writeFileSync(path.join(projectDir, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
    envs: [{ key: "local", name: "本地", baseUrl: "http://127.0.0.1:8080" }],
    defaultEnvKey: "local",
    scenarios: [
${entries}
    ]
}));
`, "utf8");
    const vars = { requestId: "scenario-{{vars.runNo}}", adjustId: "", ...extraVars };
    for (const scenario of scenarios) {
        fs.writeFileSync(path.join(projectDir, "scenarios", `${scenario.id}.js`), `ScenarioTest.registerScenario(${JSON.stringify(scenario.id)}, ScenarioTest.defineScenario({
    name: ${JSON.stringify(scenario.id)},
    vars: ${JSON.stringify(vars)},
    steps: ${JSON.stringify(scenario.steps, null, 4)}
}));
`, "utf8");
    }
    return dir;
}

function score(artifactDir) {
    const result = spawnSync(process.execPath, [scoreScript, "--artifact", artifactDir, "--json"], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return JSON.parse(result.stdout);
}

function createStep(overrides = {}) {
    return {
        name: "创建调整单",
        method: "POST",
        path: "api/order-adjusts",
        request: { body: { orderId: 1001, quantity: 2, requestId: "{{vars.requestId}}" } },
        status: 200,
        extract: [{ name: "adjustId", path: "data.id" }],
        ...overrides
    };
}

const IDEAL = [
    {
        id: "order-adjust-create",
        steps: [
            createStep({
                assertions: [
                    { path: "code", equals: 0 },
                    { path: "data.status", equals: "PENDING" }
                ]
            }),
            {
                name: "查询刚创建的调整单",
                method: "GET",
                path: "api/order-adjusts/{{vars.adjustId}}",
                status: 200,
                assertions: [
                    { path: "data.id", equals: "{{vars.adjustId}}" },
                    { path: "data.status", equals: "PENDING" }
                ]
            }
        ]
    },
    {
        id: "order-adjust-quantity-exceeded",
        steps: [
            createStep({
                request: { body: { orderId: 1002, quantity: 1, requestId: "{{vars.requestId}}" } },
                extract: [],
                assertions: [{ path: "code", equals: 40901 }]
            }),
            {
                name: "确认未产生调整单记录",
                method: "GET",
                path: "api/order-adjusts",
                request: { params: { orderId: 1002 } },
                status: 200,
                assertions: [{ path: "data.total", equals: 0 }]
            }
        ]
    },
    {
        id: "order-adjust-idempotent-submit",
        steps: [
            createStep({
                assertions: [{ path: "code", equals: 0 }, { path: "data.id", exists: true }]
            }),
            createStep({
                name: "重复提交同一 requestId",
                extract: [],
                assertions: [
                    { path: "code", equals: 0 },
                    { path: "data.id", equals: "{{vars.adjustId}}" }
                ]
            }),
            {
                name: "确认只存在一条记录",
                method: "GET",
                path: "api/order-adjusts",
                request: { params: { orderId: 1001 } },
                status: 200,
                assertions: [{ path: "data.total", equals: 1 }]
            }
        ]
    },
    {
        id: "order-adjust-status-transition",
        steps: [
            createStep({ assertions: [{ path: "code", equals: 0 }] }),
            {
                name: "首次审批通过",
                method: "POST",
                path: "api/order-adjusts/{{vars.adjustId}}/approve",
                status: 200,
                assertions: [{ path: "code", equals: 0 }, { path: "data.status", equals: "APPROVED" }]
            },
            {
                name: "已审批后再次审批被拒",
                method: "POST",
                path: "api/order-adjusts/{{vars.adjustId}}/approve",
                status: 200,
                assertions: [{ path: "code", equals: 40903 }]
            },
            {
                name: "确认状态未发生变化",
                method: "GET",
                path: "api/order-adjusts/{{vars.adjustId}}",
                status: 200,
                assertions: [{ path: "data.status", equals: "APPROVED" }]
            }
        ]
    },
    {
        id: "order-adjust-quantity-invalid",
        steps: [
            createStep({
                request: { body: { orderId: 1001, quantity: 0, requestId: "{{vars.requestId}}" } },
                extract: [],
                assertions: [{ path: "code", equals: 40001 }]
            }),
            {
                name: "确认未落单",
                method: "GET",
                path: "api/order-adjusts",
                request: { params: { orderId: 1001 } },
                status: 200,
                assertions: [{ path: "data.total", equals: 0 }]
            }
        ]
    }
];

// 典型的弱产出：只断言 HTTP 状态，把业务失败猜成 500，并且丢掉基线场景。
const WEAK = [
    {
        id: "order-adjust-create-v2",
        steps: [
            createStep({ status: 500, extract: [] }),
            createStep({ name: "重复创建", status: 500, extract: [] })
        ]
    },
    {
        id: "order-adjust-reject",
        steps: [
            createStep({
                name: "数量超限",
                status: 500,
                extract: [],
                assertions: [{ path: "code", equals: 500 }]
            })
        ]
    }
];

test("评分器：理想产出接近满分，弱产出显著低分", () => {
    const idealDir = writeArtifact(IDEAL);
    const weakDir = writeArtifact(WEAK);
    try {
        const ideal = score(idealDir);
        const weak = score(weakDir);

        assert.ok(ideal.score.total >= 85, `理想产出应接近满分，实际 ${ideal.score.total}: summary=${JSON.stringify(ideal.summary)} rules=${JSON.stringify(ideal.rules.map((rule) => [rule.id, rule.decision, rule.findings]))}`);
        assert.ok(weak.score.total <= 30, `弱产出应显著低分，实际 ${weak.score.total}`);
        assert.ok(ideal.score.total > weak.score.total + 40, "两者应拉开明显差距");

        const idealRules = Object.fromEntries(ideal.rules.map((rule) => [rule.id, rule]));
        assert.equal(idealRules.R1.decision, "增强", "基线场景补断言应判为增强");
        assert.equal(idealRules.R2.decision, "新建");
        assert.equal(idealRules.R3.decision, "新建");
        assert.equal(idealRules.R4.decision, "新建");
        assert.equal(idealRules.R6.decision, "新建");

        const weakRules = Object.fromEntries(weak.rules.map((rule) => [rule.id, rule]));
        assert.notEqual(weakRules.R2.decision, "新建", "只有 500 猜测的场景不应算有效覆盖");
        assert.ok(
            weak.hygiene.penalties.some((penalty) => penalty.kind === "wrong-http-status"),
            `应识别契约误读: ${JSON.stringify(weak.hygiene.penalties)}`
        );
        assert.ok(
            weak.hygiene.penalties.some((penalty) => penalty.kind === "guessed-code"),
            `应识别猜测错误码: ${JSON.stringify(weak.hygiene.penalties)}`
        );
    } finally {
        fs.rmSync(idealDir, { recursive: true, force: true });
        fs.rmSync(weakDir, { recursive: true, force: true });
    }
});

test("评分器：改写基线场景 ID 会命中卫生项扣分", () => {
    const renamed = [
        {
            id: "order-adjust-create-renamed",
            steps: [
                createStep({
                    assertions: [
                        { path: "code", equals: 0 },
                        { path: "data.status", equals: "PENDING" }
                    ]
                }),
                {
                    name: "查询调整单",
                    method: "GET",
                    path: "api/order-adjusts/{{vars.adjustId}}",
                    status: 200,
                    assertions: [{ path: "data.status", equals: "PENDING" }]
                }
            ]
        }
    ];
    const dir = writeArtifact(renamed);
    try {
        const report = score(dir);
        assert.ok(
            report.hygiene.penalties.some((penalty) => penalty.kind === "baseline-removed"),
            `应识别基线场景被改名: ${JSON.stringify(report.hygiene.penalties)}`
        );
        assert.ok(report.score.hygiene < 10, "卫生项应扣分");
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test("评分器：拒绝/幂等场景用「前后 total 相等」证明副作用，应算后置验证", () => {
    const scenarios = [
        {
            id: "order-adjust-quantity-exceeded",
            steps: [
                {
                    name: "记录拒绝前的总数",
                    method: "GET",
                    path: "api/order-adjusts",
                    request: { params: { orderId: 1002 } },
                    status: 200,
                    assertions: [{ path: "code", equals: 0 }],
                    extract: [{ name: "totalBefore", path: "data.total" }]
                },
                createStep({
                    request: { body: { orderId: 1002, quantity: 1, requestId: "{{vars.requestId}}" } },
                    extract: [],
                    assertions: [{ path: "code", equals: 40901 }]
                }),
                {
                    name: "确认未新增记录",
                    method: "GET",
                    path: "api/order-adjusts",
                    request: { params: { orderId: 1002 } },
                    status: 200,
                    assertions: [{ path: "data.total", equals: "{{vars.totalBefore}}" }]
                }
            ]
        },
        {
            id: "order-adjust-idempotent",
            steps: [
                createStep({ assertions: [{ path: "code", equals: 0 }, { path: "data.id", exists: true }] }),
                {
                    name: "记录首次提交后的总数",
                    method: "GET",
                    path: "api/order-adjusts",
                    request: { params: { orderId: 1001 } },
                    status: 200,
                    assertions: [{ path: "code", equals: 0 }],
                    extract: [{ name: "totalAfterFirst", path: "data.total" }]
                },
                createStep({
                    name: "同一 requestId 重放",
                    extract: [],
                    assertions: [{ path: "code", equals: 0 }, { path: "data.id", equals: "{{vars.adjustId}}" }]
                }),
                {
                    name: "确认未新增记录",
                    method: "GET",
                    path: "api/order-adjusts",
                    request: { params: { orderId: 1001 } },
                    status: 200,
                    assertions: [{ path: "data.total", equals: "{{vars.totalAfterFirst}}" }]
                }
            ]
        },
        {
            id: "order-adjust-quantity-invalid",
            steps: [
                {
                    name: "记录拒绝前的总数",
                    method: "GET",
                    path: "api/order-adjusts",
                    request: { params: { orderId: 1001 } },
                    status: 200,
                    assertions: [{ path: "code", equals: 0 }],
                    extract: [{ name: "totalBeforeInvalid", path: "data.total" }]
                },
                createStep({
                    request: { body: { orderId: 1001, quantity: 0, requestId: "{{vars.requestId}}" } },
                    extract: [],
                    assertions: [{ path: "code", equals: 40001 }]
                }),
                {
                    name: "确认未落单",
                    method: "GET",
                    path: "api/order-adjusts",
                    request: { params: { orderId: 1001 } },
                    status: 200,
                    assertions: [{ path: "data.total", equals: "{{vars.totalBeforeInvalid}}" }]
                }
            ]
        }
    ];
    const dir = writeArtifact(scenarios, { totalBefore: 0, totalAfterFirst: 0, totalBeforeInvalid: 0 });
    try {
        const report = score(dir);
        const rules = Object.fromEntries(report.rules.map((rule) => [rule.id, rule]));
        for (const id of ["R2", "R3", "R6"]) {
            assert.equal(
                rules[id].postchecked,
                true,
                `${id} 应识别「前后 total 相等」为后置验证: ${JSON.stringify(rules[id])}`
            );
        }
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test("评分器：只断言 HTTP 200 的基线场景得 0 覆盖分", () => {
    const dir = writeArtifact([
        {
            id: "order-adjust-create",
            steps: [createStep({ extract: [] })]
        }
    ]);
    try {
        const report = score(dir);
        assert.equal(report.score.coverage, 0, "只有 status:200 不能算有效覆盖");
        assert.equal(report.score.assertion, 0);
        assert.equal(report.score.postcheck, 0);
        assert.ok(report.score.total <= 10, `弱断言不应拿到覆盖分，实际 ${report.score.total}`);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

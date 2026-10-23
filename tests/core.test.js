import assert from "node:assert/strict";
import test from "node:test";
import {
    applyExtract,
    buildAssertions,
    buildChinaIdNumber,
    buildUsccCode,
    defineConfig,
    evaluateAssertion,
    formatDuration,
    gb11643Checksum,
    generateSignature,
    getByPath,
    isGlobalParam,
    joinUrl,
    luhnCheckDigit,
    maskSecret,
    mergeGlobals,
    normalizeGlobalParam,
    resolve,
    sanitizeSensitive,
    seedToIndex,
    tokenizePath,
    usccCheckChar,
    validateAssertion
} from "../src/index.js";

test("模板插值保留完整表达式的原始类型和长整型字符串", () => {
    const runtime = {
        vars: {
            id: "2070168391735058434",
            count: 3,
            payload: { ok: true },
            runNo: "123456",
            recordName: "scenario-{{vars.runNo}}",
            self: "{{vars.self}}"
        }
    };
    assert.equal(resolve("id={{vars.id}}", runtime), "id=2070168391735058434");
    assert.equal(resolve("{{vars.count}}", runtime), 3);
    assert.deepEqual(resolve("{{vars.payload}}", runtime), { ok: true });
    assert.equal(resolve("{{vars.recordName}}", runtime), "scenario-123456");
    assert.equal(resolve("name={{vars.recordName}}", runtime), "name=scenario-123456");
    assert.equal(resolve("{{vars.self}}", runtime), "{{vars.self}}");
});

test("tokenizePath 对外返回可变副本，缓存内部不受调用方改写污染", () => {
    const first = tokenizePath("user.list[0].name");
    assert.deepEqual(first, ["user", "list", "[0]", "name"]);
    // 公开类型为 string[]：调用方按声明修改数组不应抛错（旧行为可修改）
    first.push("injected");
    assert.deepEqual(first, ["user", "list", "[0]", "name", "injected"]);
    // 后续调用返回独立副本，缓存未受污染（命中缓存也不会返回同一引用）
    const second = tokenizePath("user.list[0].name");
    assert.deepEqual(second, ["user", "list", "[0]", "name"]);
    assert.notEqual(first, second);
    // 非法路径的 null 结果同样缓存（has 判定区分「未缓存」与「缓存为 null」）
    assert.equal(tokenizePath("a..b"), null);
    assert.equal(tokenizePath("a..b"), null);
});

test("模板根写法 vars[ / lastResponse[ / lastResponseBody[ 支持引号键（含运算符字符的键名可取值）", () => {
    const runtime = {
        vars: { "a>b": 7, "x:y": "v", obj: { "a]>b": 8 } },
        lastResponse: { "odd key": "r" },
        lastResponseBody: { "a=b": 9 }
    };
    // 键名含运算符字符时引号键是唯一逃生写法，且必须真实解析到值（防「定义期放行运行期空串」）
    assert.equal(resolve("{{vars[\"a>b\"]}}", runtime), 7);
    assert.equal(resolve("{{vars[\"x:y\"]}}", runtime), "v");
    assert.equal(resolve("{{vars.obj[\"a]>b\"]}}", runtime), 8);
    assert.equal(resolve("{{lastResponse[\"odd key\"]}}", runtime), "r");
    assert.equal(resolve("{{lastResponseBody[\"a=b\"]}}", runtime), 9);
});

test("引号键转义与畸形路径（vars[]/vars[/未闭合引号不得静默取值）", () => {
    const runtime = {
        vars: { "a\"b": 42, "a\\b": 43, list: [1, 2], a: 1 },
        lastResponse: { status: 200 }
    };
    // 引号键内支持 \" \' \\ 转义：键名含引号本身也能寻址
    assert.equal(resolve("{{vars[\"a\\\"b\"]}}", runtime), 42);
    assert.equal(resolve("{{vars[\"a\\\\b\"]}}", runtime), 43);
    // 未声明的 \x 转义序列按字面保留：键 a\b（字面反斜杠）不被吞成 ab
    assert.equal(resolve("{{vars[\"a\\b\"]}}", runtime), 43);
    // 负索引下标维持既有语义
    assert.equal(resolve("{{vars.list[-1]}}", runtime), 2);
    // 畸形路径（空下标/未闭合/裸结尾点/双点/下标后缺分隔符）解析为 undefined
    // 而非根对象或错值——{{vars[]}} 若返回整个 vars 对象会让 when 条件意外成立
    assert.equal(resolve("{{vars[]}}", runtime), "");
    assert.equal(resolve("{{vars[}}", runtime), "");
    assert.equal(resolve("{{vars.list[]}}", runtime), "");
    assert.equal(resolve("{{vars.a..b}}", runtime), "");
    // 根前缀后双点：vars..a 与定义期同口径判缺（前导点兼容仅限 getByPath 直接调用）
    assert.equal(resolve("{{vars..a}}", runtime), "");
    assert.equal(resolve("{{vars..}}", runtime), "");
    assert.equal(resolve("{{lastResponse..status}}", runtime), "");
    // 下标后缺点分隔符的裸段非法（["a"]key 不得按 obj.key 取值）
    assert.equal(resolve("{{vars[\"a\"]a}}", runtime), "");
});

test("断言、响应提取和 URL 拼接", () => {
    const runtime = { vars: {}, lastResponse: null, lastResponseBody: null };
    const step = {
        status: 200,
        extract: [{ name: "createdId", path: "data.id" }],
        assertions: [{ name: "成功", path: "code", equals: 200 }]
    };
    const response = { status: 200, headers: {}, body: { code: 200, data: { id: "9007199254740993" } }, bodyText: "" };
    applyExtract(step, response, runtime);
    assert.equal(runtime.vars.createdId, "9007199254740993");
    assert.ok(buildAssertions(step, response, runtime).every((item) => item.passed));
    assert.equal(joinUrl("http://localhost:8080/", "/health"), "http://localhost:8080/health");
});

test("未声明断言时默认要求 HTTP 2xx", () => {
    const runtime = { vars: {}, lastResponse: null, lastResponseBody: null };
    const success = buildAssertions({}, { status: 204, headers: {}, body: null, bodyText: "" }, runtime);
    const failure = buildAssertions({}, { status: 500, headers: {}, body: null, bodyText: "" }, runtime);
    assert.equal(success.length, 1);
    assert.equal(success[0].passed, true);
    assert.equal(failure[0].passed, false);
});

test("默认 2xx 断言不误伤本地适配器（status 为 LOCAL 字符串）", () => {
    const runtime = { vars: {}, lastResponse: null, lastResponseBody: null };
    const local = buildAssertions({}, { status: "LOCAL", headers: {}, body: { savedTo: "/tmp/a.txt" }, bodyText: null }, runtime);
    assert.equal(local.length, 1);
    assert.equal(local[0].name, "返回 HTTP 2xx");
    assert.equal(local[0].passed, true);
    assert.equal(local[0].actual, "LOCAL");
});

test("签名稳定且调试数据保留原始值", () => {
    const first = generateSignature({ timestamp: 1, apiKey: "demo", nonce: "n" }, "secret");
    const second = generateSignature({ nonce: "n", apiKey: "demo", timestamp: 1 }, "secret");
    assert.equal(first, second);
    assert.match(first, /^[A-F0-9]{32}$/);
    assert.deepEqual(sanitizeSensitive({ apiKey: "abcdefghijklm", nested: { accessToken: "123456789012345" } }), {
        apiKey: "abcdefghijklm",
        nested: { accessToken: "123456789012345" }
    });
});

test("配置规范化并拒绝缺少环境标识", () => {
    const config = defineConfig({ envs: [{ key: "local", name: "本地", baseUrl: "http://localhost" }], scenarios: ["scenarios/a.js"] });
    assert.equal(config.scenarios[0].url, "scenarios/a.js");
    assert.throws(() => defineConfig({ envs: [{ name: "无 key" }] }), /key/);
    assert.throws(() => defineConfig({ envs: [{ key: "same", name: "一" }, { key: "same", name: "二" }] }), /重复/);
    assert.throws(() => defineConfig({ envs: [{ key: "local", name: "本地" }], defaultEnvKey: "missing" }), /defaultEnvKey/);
    assert.throws(() => defineConfig({ scenarios: [{ id: "empty", name: "空场景" }] }), /url/);
    assert.throws(() => defineConfig({ scenarios: [""] }), /不能为空/);
    assert.throws(() => defineConfig({ variables: [{ name: "token" }, { name: "token" }] }), /重复/);
    assert.throws(() => defineConfig({ requestTimeoutMs: 0 }), /正数/);
    assert.throws(() => defineConfig({ scenarios: [{ id: "m", url: "s.js", manual: "yes" }] }), /manual 必须是布尔值/);
});

function runtimeWith(vars = {}) {
    return { vars, lastResponse: null, lastResponseBody: null };
}

function responseWith(body, status = 200) {
    return { status, headers: {}, body, bodyText: typeof body === "string" ? body : "" };
}

test("断言 schema：未知键与缺少操作符立即抛错，错误含定位信息", () => {
    const context = { scenarioName: "S1", stepNo: 2, stepName: "步骤B", assertionNo: 3 };
    assert.throws(() => validateAssertion({ path: "x", unknownKey: 1 }, context), /场景 S1 第 2 步 步骤 步骤B 第 3 条断言无效.*未知键 "unknownKey"/);
    assert.throws(() => validateAssertion({ path: "x" }, context), /必须至少包含一个操作符/);
    assert.throws(() => validateAssertion({ name: "n", path: "x", foo: 1, equals: 2 }, context), /未知键 "foo"/);
    assert.throws(() => validateAssertion(null, context), /必须是对象/);
    // 合法断言不抛
    validateAssertion({ name: "ok", path: "data.total", gte: 5, implicit: false }, context);
});

test("matches 静态期望值定义期校验：非法正则 fail-fast，模板期望值跳过", () => {
    const context = { scenarioName: "S1", stepNo: 1, stepName: "步骤A", assertionNo: 1 };
    // 非法静态正则：定义期即报"正则写错"，不再拖到执行期吞成"值不匹配"
    assert.throws(
        () => validateAssertion({ path: "code", matches: "([" }, context),
        /matches 期望值不是合法正则表达式/
    );
    assert.throws(
        () => validateAssertion({ path: "code", matches: "*bad" }, context),
        /matches 期望值不是合法正则表达式/
    );
    // 合法静态正则与含模板的期望值照常通过（模板待运行时解析）
    validateAssertion({ path: "code", matches: "^\\d+$" }, context);
    validateAssertion({ path: "code", matches: "^{{vars.pattern}}$" }, context);
    // each 子断言内的非法 matches 同样定义期拒绝
    assert.throws(
        () => validateAssertion({ path: "items", each: { path: "code", matches: "([" } }, context),
        /matches 期望值不是合法正则表达式/
    );
});

test("五个新增操作符 pass/fail", () => {
    const runtime = runtimeWith();
    const response = responseWith({ total: 10, items: ["a", "b"], obj: { x: 1 } });

    const notEqualsPass = evaluateAssertion({ path: "total", notEquals: 11 }, response, runtime);
    assert.equal(notEqualsPass.passed, true);
    const notEqualsFail = evaluateAssertion({ path: "total", notEquals: 10 }, response, runtime);
    assert.equal(notEqualsFail.passed, false);
    assert.equal(notEqualsFail.actual, 10);
    assert.equal(notEqualsFail.expected, 10);
    // 深比较取反：对象相等应失败
    assert.equal(evaluateAssertion({ path: "obj", notEquals: { x: 1 } }, response, runtime).passed, false);
    assert.equal(evaluateAssertion({ path: "obj", notEquals: { x: 2 } }, response, runtime).passed, true);

    assert.equal(evaluateAssertion({ path: "total", gt: 9 }, response, runtime).passed, true);
    assert.equal(evaluateAssertion({ path: "total", gt: 10 }, response, runtime).passed, false);
    assert.equal(evaluateAssertion({ path: "total", gte: 10 }, response, runtime).passed, true);
    assert.equal(evaluateAssertion({ path: "total", gte: 11 }, response, runtime).passed, false);
    assert.equal(evaluateAssertion({ path: "total", lt: 11 }, response, runtime).passed, true);
    assert.equal(evaluateAssertion({ path: "total", lt: 10 }, response, runtime).passed, false);
    assert.equal(evaluateAssertion({ path: "total", lte: 10 }, response, runtime).passed, true);
    assert.equal(evaluateAssertion({ path: "total", lte: 9 }, response, runtime).passed, false);
});

test("equals/notEquals/includes/oneOf 深比较对对象键序不敏感", () => {
    const runtime = runtimeWith();
    const response = responseWith({
        obj: { b: 2, a: 1 },
        nested: { x: { d: 4, c: 3 }, list: [{ y: 2, x: 1 }] },
        items: [{ q: 2, p: 1 }, { r: 3 }]
    });

    // equals：键序重排的等值对象仍相等（Java 服务端 HashMap 序列化顺序常见不稳定）
    assert.equal(evaluateAssertion({ path: "obj", equals: { a: 1, b: 2 } }, response, runtime).passed, true);
    assert.equal(evaluateAssertion({ path: "nested", equals: { list: [{ x: 1, y: 2 }], x: { c: 3, d: 4 } } }, response, runtime).passed, true);
    // 值不同/键名不同仍然判不等（键序不敏感 ≠ 宽松比较）
    assert.equal(evaluateAssertion({ path: "obj", equals: { a: 1, b: 3 } }, response, runtime).passed, false);
    assert.equal(evaluateAssertion({ path: "obj", equals: { a: 1, c: 2 } }, response, runtime).passed, false);

    // notEquals：深层相等时键序重排不误判为不等
    assert.equal(evaluateAssertion({ path: "obj", notEquals: { b: 2, a: 1 } }, response, runtime).passed, false);
    assert.equal(evaluateAssertion({ path: "obj", notEquals: { a: 1, b: 9 } }, response, runtime).passed, true);

    // includes：数组内对象成员按键序不敏感匹配
    assert.equal(evaluateAssertion({ path: "items", includes: { p: 1, q: 2 } }, response, runtime).passed, true);
    assert.equal(evaluateAssertion({ path: "items", includes: { p: 2, q: 1 } }, response, runtime).passed, false);

    // oneOf：候选对象键序不敏感
    assert.equal(evaluateAssertion({ path: "obj", oneOf: [{ z: 0 }, { b: 2, a: 1 }] }, response, runtime).passed, true);
    assert.equal(evaluateAssertion({ path: "obj", oneOf: [{ z: 0 }, { a: 1, b: 8 }] }, response, runtime).passed, false);

    // undefined 值键与 JSON.stringify 语义对齐（序列化时被忽略）：不构成差异
    assert.equal(evaluateAssertion({ path: "obj", equals: { a: 1, b: 2, extra: undefined } }, response, runtime).passed, true);
});


test("空候选集合的 oneOf/includes 直接失败，不对不可序列化值做稳定序列化", () => {
    const runtime = runtimeWith();
    // 适配器协议允许任意 body（仅约束响应对象与 status）：body 为 BigInt 时
    // JSON.stringify 会抛 TypeError，空候选集合本应短路为普通断言失败
    const bigintResponse = { status: 200, headers: {}, body: 1n, bodyText: "" };
    const oneOfEmpty = evaluateAssertion({ path: "", oneOf: [] }, bigintResponse, runtime);
    assert.equal(oneOfEmpty.passed, false);
    assert.equal(oneOfEmpty.actual, 1n);

    // includes：实际数组为空 → 直接失败，不序列化期望值（1n）
    const emptyListResponse = { status: 200, headers: {}, body: [], bodyText: "" };
    const includesEmpty = evaluateAssertion({ path: "", includes: 1n }, emptyListResponse, runtime);
    assert.equal(includesEmpty.passed, false);
    assert.deepEqual(includesEmpty.actual, []);
    assert.equal(includesEmpty.expected, 1n);

    // 前序操作符已失败时不进行后续无谓序列化：actual 含 BigInt 也不会抛错
    const bigintItemsResponse = { status: 200, headers: {}, body: [1n], bodyText: "" };
    const includesSkipped = evaluateAssertion({ exists: false, includes: 1n }, bigintItemsResponse, runtime);
    assert.equal(includesSkipped.passed, false);
    const oneOfSkipped = evaluateAssertion({ exists: false, oneOf: [{}] }, bigintResponse, runtime);
    assert.equal(oneOfSkipped.passed, false);
});

test("数字比较断言：类型不符合时断言失败而非抛异常，并保留 actual/expected", () => {
    const runtime = runtimeWith();
    const stringBody = responseWith({ total: "10" });
    // actual 是字符串：不隐式转换，断言失败
    const result = evaluateAssertion({ path: "total", gte: 5 }, stringBody, runtime);
    assert.equal(result.passed, false);
    assert.equal(result.actual, "10");
    assert.equal(result.expected, 5);
    // expected 是字面字符串 "5"：不做隐式转换，断言失败
    assert.equal(evaluateAssertion({ path: "total", gte: "5" }, responseWith({ total: 10 }), runtime).passed, false);
    // expected 是整段模板且变量为数字时保留数字类型，断言通过
    const templated = evaluateAssertion({ path: "total", gte: "{{vars.min}}" }, responseWith({ total: 10 }), runtimeWith({ min: 5 }));
    assert.equal(templated.passed, true);
    // 非有限数字（NaN/Infinity）断言失败而非抛异常
    assert.equal(evaluateAssertion({ path: "total", gte: NaN }, responseWith({ total: 10 }), runtime).passed, false);
    assert.equal(evaluateAssertion({ path: "total", lte: Infinity }, responseWith({ total: 10 }), runtime).passed, false);
});

test("length 操作符：数组元素数/字符串字符数/对象键数精确比较", () => {
    const runtime = runtimeWith();
    const response = responseWith({ items: ["a", "b", "c"], name: "订单", meta: { x: 1, y: 2 }, total: 10 });

    // 数组/字符串/对象键数三类容器
    assert.equal(evaluateAssertion({ path: "items", length: 3 }, response, runtime).passed, true);
    assert.equal(evaluateAssertion({ path: "name", length: 2 }, response, runtime).passed, true);
    assert.equal(evaluateAssertion({ path: "meta", length: 2 }, response, runtime).passed, true);

    // 比较所用实际值回写为长度，断言表可直接读数
    const fail = evaluateAssertion({ path: "items", length: 5 }, response, runtime);
    assert.equal(fail.passed, false);
    assert.equal(fail.actual, 3);
    assert.equal(fail.expected, 5);

    // 非容器类型（number）直接失败，actual 保留原始值
    const notContainer = evaluateAssertion({ path: "total", length: 2 }, response, runtime);
    assert.equal(notContainer.passed, false);
    assert.equal(notContainer.actual, 10);

    // 路径不存在（undefined）失败而非抛异常
    assert.equal(evaluateAssertion({ path: "missing", length: 0 }, response, runtime).passed, false);

    // expected 模板解析为数字时正常比较；非有限数字失败
    assert.equal(evaluateAssertion({ path: "items", length: "{{vars.n}}" }, response, runtimeWith({ n: 3 })).passed, true);
    assert.equal(evaluateAssertion({ path: "items", length: NaN }, response, runtime).passed, false);
    assert.equal(evaluateAssertion({ path: "items", length: "3" }, response, runtime).passed, false);
});

test("target: duration 断言单次请求耗时（response.durationMs）", () => {
    const runtime = runtimeWith();
    const response = { ...responseWith({ ok: true }), durationMs: 128 };

    assert.equal(evaluateAssertion({ target: "duration", lte: 800 }, response, runtime).passed, true);
    assert.equal(evaluateAssertion({ target: "duration", lte: 100 }, response, runtime).passed, false);
    const fail = evaluateAssertion({ target: "duration", lte: 100 }, response, runtime);
    assert.equal(fail.actual, 128);
    assert.equal(fail.expected, 100);

    // durationMs 缺失（未经过引擎挂载的裸响应）时类型不符，断言失败而非抛异常
    assert.equal(evaluateAssertion({ target: "duration", lte: 800 }, responseWith({}), runtime).passed, false);
    // duration 与数值操作符组合走既有 finiteNumber 口径
    assert.equal(evaluateAssertion({ target: "duration", gte: 100, lte: 200 }, response, runtime).passed, true);
});

test("运行时非法断言被 evaluateAssertion 拒绝（防止插件绕过）", () => {
    const runtime = runtimeWith();
    const response = responseWith({ total: 10 });
    assert.throws(() => evaluateAssertion({ path: "total", gte: 5, bogus: 1 }, response, runtime), /未知键 "bogus"/);
    assert.throws(() => evaluateAssertion({ path: "total" }, response, runtime), /必须至少包含一个操作符/);
});

test("extract required:true 路径不存在时返回 failures；默认产生 warning 且不含响应内容", () => {
    const runtime = runtimeWith({});
    const response = responseWith({ code: 200 });
    const required = applyExtract({ extract: [{ name: "missingId", path: "data.id", required: true }] }, response, runtime);
    assert.equal(required.failures.length, 1);
    assert.equal(required.failures[0].passed, false);
    assert.match(required.failures[0].name, /missingId/);
    assert.equal(required.warnings.length, 0);
    assert.equal(runtime.vars.missingId, undefined);

    const relaxed = applyExtract({ extract: [{ name: "relaxedId", path: "data.id" }] }, response, runtime);
    assert.equal(relaxed.failures.length, 0);
    assert.equal(relaxed.warnings.length, 1);
    assert.match(relaxed.warnings[0], /relaxedId/);
    assert.doesNotMatch(relaxed.warnings[0], /secret|token/i);
    assert.equal(runtime.vars.relaxedId, undefined);

    // 正常路径无 warning 无 failure
    const ok = applyExtract({ extract: [{ name: "code", path: "code" }] }, response, runtime);
    assert.equal(ok.failures.length, 0);
    assert.equal(ok.warnings.length, 0);
    assert.equal(runtime.vars.code, 200);
});

test("extract 不允许覆盖保留变量 runId/runNo", () => {
    const runtime = runtimeWith({});
    const response = responseWith({ id: "1" });
    assert.throws(() => applyExtract({ extract: [{ name: "runId", path: "id" }] }, response, runtime), /保留变量/);
    assert.throws(() => applyExtract({ extract: [{ name: "runNo", path: "id" }] }, response, runtime), /保留变量/);
});

test("extract default：路径缺失时按声明默认值兜底（支持模板），不产生 warning", () => {
    const runtime = runtimeWith({ pageSize: 20 });
    const response = responseWith({ code: 200, data: null });
    const step = {
        extract: [
            { name: "total", path: "data.total", default: 0 },
            { name: "pageSize", path: "data.pageSize", default: "{{vars.pageSize}}" },
            { name: "code", path: "code", default: -1 },
            { name: "nil", path: "data", default: "fallback" },
            { name: "missed", path: "data.id" }
        ]
    };
    const result = applyExtract(step, response, runtime);
    // 缺失 + default：取声明值（模板照常解析），无 warning
    assert.equal(runtime.vars.total, 0);
    assert.equal(runtime.vars.pageSize, 20);
    // 路径存在时实际值优先，default 不参与
    assert.equal(runtime.vars.code, 200);
    // JSON null 是真实值而非缺失，不触发兜底
    assert.equal(runtime.vars.nil, null);
    // 未声明 default 的缺失仍按既有口径产生 warning
    assert.equal(result.warnings.length, 1);
    assert.match(result.warnings[0], /missed/);
    assert.equal(runtime.vars.missed, undefined);
    assert.equal(result.failures.length, 0);
});

test("extract required:true 与 default 互斥即抛错", () => {
    const runtime = runtimeWith({});
    const response = responseWith({ code: 200 });
    assert.throws(
        () => applyExtract({ extract: [{ name: "x", path: "data.id", required: true, default: 1 }] }, response, runtime),
        /required: true 与 default 互斥/
    );
});

test("数组负索引路径：[-N] 取倒数第 N 项，引号键与非数组维持属性名语义", () => {
    const body = {
        records: [{ id: "a" }, { id: "b" }, { id: "c" }],
        plain: { "-1": "字面键" }
    };
    assert.equal(getByPath(body, "records[-1].id"), "c");
    assert.equal(getByPath(body, "records[-3].id"), "a");
    assert.equal(getByPath(body, "records[-4]"), undefined, "越界负索引按路径不存在处理");
    // 非数组光标与引号键维持既有属性名语义（{ "-1": ... } 字面键不受影响）
    assert.equal(getByPath(body, 'plain["-1"]'), "字面键");
    assert.equal(getByPath(body, "plain[-1]"), "字面键");

    // extract / 断言 / 模板插值与 getByPath 同口径
    const runtime = runtimeWith({ list: [10, 20, 30] });
    assert.equal(resolve("{{vars.list[-1]}}", runtime), 30);
    const response = responseWith(body);
    assert.equal(evaluateAssertion({ path: "records[-1].id", equals: "c" }, response, runtime).passed, true);
    const result = applyExtract({ extract: [{ name: "lastId", path: "records[-1].id" }] }, response, runtime);
    assert.equal(result.warnings.length, 0);
    assert.equal(runtime.vars.lastId, "c");
});

test("全局参数：isGlobalParam 校验、normalize 转字符串、mergeGlobals 按 type:name 去重且后者覆盖", () => {
    assert.equal(isGlobalParam({ type: "header", name: "X-Token", value: "t" }), true);
    assert.equal(isGlobalParam({ type: "bogus", name: "X", value: 1 }), false);
    assert.equal(isGlobalParam({ type: "query", name: "  ", value: 1 }), false);
    assert.equal(isGlobalParam(null), false);
    assert.deepEqual(
        normalizeGlobalParam({ type: "cookie", name: "sid", value: 42 }),
        { type: "cookie", name: "sid", value: "42" }
    );
    assert.deepEqual(
        mergeGlobals(
            [{ type: "header", name: "X-A", value: "1" }, { type: "query", name: "q", value: "a" }, { invalid: true }],
            [{ type: "header", name: "X-A", value: "2" }]
        ),
        [
            // Map 语义：覆盖值但保持首次插入顺序；非法项直接跳过
            { type: "header", name: "X-A", value: "2" },
            { type: "query", name: "q", value: "a" }
        ]
    );
    // 空入参与 undefined 列表安全
    assert.deepEqual(mergeGlobals(), []);
    assert.deepEqual(mergeGlobals(undefined, null), []);
});

test("模板可读取 lastResponse / lastResponseBody 及其嵌套路径", () => {
    const runtime = {
        vars: { name: "run-1" },
        lastResponse: { status: 201, headers: { "x-trace": "t-9" }, body: { code: 0 }, bodyText: "raw" },
        lastResponseBody: { code: 0, data: { id: "7" } }
    };
    assert.equal(resolve("{{lastResponse.status}}", runtime), 201);
    assert.equal(resolve("trace={{lastResponse.headers.x-trace}}", runtime), "trace=t-9");
    assert.equal(resolve("{{lastResponseBody.data.id}}", runtime), "7");
    assert.equal(resolve("{{lastResponseBody}}", runtime), runtime.lastResponseBody);
    // 裸变量名优先命中 vars 同名键（hasOwnProperty 短路），裸路径只在 vars 内解析
    assert.equal(resolve("{{name}}", runtime), "run-1");
    assert.equal(resolve("{{vars.data.id}}", runtime), "");
    // 路径不存在时插值为空串
    assert.equal(resolve("id={{lastResponseBody.data.missing}}", runtime), "id=");
});

test("GB11643 底座：标准示例号码、确定性种子与非法输入拒绝", () => {
    // 国标常见示例号码：110105 + 19491231 + 002 + X
    assert.equal(
        buildChinaIdNumber({ regionCode: "110105", birthDate: "1949-12-31", sequence: 2 }),
        "11010519491231002X"
    );
    assert.equal(gb11643Checksum("11010519491231002"), "X");
    assert.throws(() => gb11643Checksum("12345"), /17 位数字/);
    assert.throws(() => gb11643Checksum("1101051949123100A"), /17 位数字/);

    assert.throws(
        () => buildChinaIdNumber({ regionCode: "110105", birthDate: "1949-2-31", sequence: 2 }),
        /YYYY-MM-DD/
    );
    assert.throws(
        () => buildChinaIdNumber({ regionCode: "110105", birthDate: "2026-02-30", sequence: 2 }),
        /合法日历日期/
    );
    assert.throws(
        () => buildChinaIdNumber({ regionCode: "110105", birthDate: "2026-02-28", sequence: 1000 }),
        /0-999/
    );
    assert.throws(
        () => buildChinaIdNumber({ regionCode: "110105", birthDate: "2026-02-28", sequence: 1.5 }),
        /0-999/
    );

    // 种子映射确定性：同种子同结果，值域始终落在 [0, max)
    assert.equal(seedToIndex("run-1|idNo", 500), seedToIndex("run-1|idNo", 500));
    for (const seed of ["", null, "a", "b", "run-2|idNo"]) {
        const index = seedToIndex(seed, 7);
        assert.ok(index >= 0 && index < 7, `seed=${seed} 越界: ${index}`);
    }
});

test("Luhn 底座：公认测试卡号锚点与非法输入拒绝", () => {
    // Visa 公认测试卡 4111111111111111 的前 15 位 + 校验位
    assert.equal(luhnCheckDigit("411111111111111"), "1");
    assert.equal(luhnCheckDigit("7992739871"), "3");
    assert.throws(() => luhnCheckDigit(""), /纯数字/);
    assert.throws(() => luhnCheckDigit("4111a11111111111"), /纯数字/);
});

test("USCC 底座：GB 32100 锚点、组装与非法输入拒绝", () => {
    // 手算锚点：91 + 110000 + 123456789 的 GB 32100 校验位为 Q
    assert.equal(usccCheckChar("91110000123456789"), "Q");
    assert.equal(
        buildUsccCode({ categoryCode: "91", regionCode: "110000", orgCode: "123456789" }),
        "91110000123456789Q"
    );
    // 小写 orgCode 归一化
    assert.equal(
        buildUsccCode({ categoryCode: "91", regionCode: "110000", orgCode: "1234567xy" }),
        buildUsccCode({ categoryCode: "91", regionCode: "110000", orgCode: "1234567XY" })
    );
    assert.throws(() => usccCheckChar("9111000012345678"), /17 位字符/);
    assert.throws(() => usccCheckChar("9111000012345678S"), /非法字符 S/);
    assert.throws(() => buildUsccCode({ categoryCode: "9", regionCode: "110000", orgCode: "123456789" }), /2 位数字/);
    assert.throws(() => buildUsccCode({ categoryCode: "91", regionCode: "11000", orgCode: "123456789" }), /6 位数字/);
    assert.throws(() => buildUsccCode({ categoryCode: "91", regionCode: "110000", orgCode: "1234567890" }), /9 位/);
    assert.throws(() => buildUsccCode({ categoryCode: "91", regionCode: "110000", orgCode: "12345678I" }), /9 位/);
});

test("敏感值脱敏与耗时格式化", () => {
    assert.equal(maskSecret(undefined), "");
    assert.equal(maskSecret(null), "");
    assert.equal(maskSecret(""), "");
    assert.equal(maskSecret("short"), "***");
    assert.equal(maskSecret("abcdefghijk"), "***");
    // 阈值是 >12：12 位仍整体隐藏，13 位起保留首尾各 4 位
    assert.equal(maskSecret("abcdefghijkl"), "***");
    assert.equal(maskSecret("abcdefghijklm"), "abcd...jklm");
    assert.equal(maskSecret("super-long-secret-token"), "supe...oken");

    assert.equal(formatDuration(42), "42 ms");
    assert.equal(formatDuration(1500), "1.50 s");
    assert.equal(formatDuration(NaN), "-");
    assert.equal(formatDuration(Infinity), "-");
});


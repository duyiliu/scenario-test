import assert from "node:assert/strict";
import test from "node:test";
import { buildMarkdownReport, eachDetailRows } from "../src/browser/ui/ui-view.js";

// 最小失败步骤形状（buildMarkdownReport 只读这些字段；summary 省略时仅影响概览行）
function failedStep(overrides) {
    return Object.assign({
        stepNo: 1,
        name: "查列表",
        method: "GET",
        path: "/list",
        status: 200,
        passed: false,
        durationFmt: "1ms",
        error: "",
        warnings: [],
        assertions: [],
        response: {}
    }, overrides);
}

test("Markdown 报告值拼接转义：换行折叠为字面量，防拆行/伪列表", () => {
    const multiLine = "第一行\n- 伪列表项";
    const report = {
        steps: [failedStep({
            error: "错误A\n- 伪列表项",
            warnings: ["警告B\n- 伪列表项"],
            assertions: [{
                name: "note",
                passed: false,
                expected: "ok",
                actual: multiLine,
                detail: [{ index: 0, actual: multiLine, assertions: [{ name: "eq", passed: false, expected: "ok", actual: multiLine }] }]
            }]
        })]
    };
    const md = buildMarkdownReport(report);
    // 换行折叠为字面量 \n：明细/失败原因/警告三类拼接点都透出字面量而非真实换行
    assert.ok(md.includes("期望 ok,实得 第一行\\n- 伪列表项"), "明细行应含字面量 \\n");
    assert.ok(md.includes("失败原因**: 错误A\\n- 伪列表项"), "失败原因应含字面量 \\n");
    assert.ok(md.includes("警告**: 警告B\\n- 伪列表项"), "警告应含字面量 \\n");
    // 判别用例：未转义的实现会以真实换行拆行（值首换行/错误/警告三处任一漏转义即失败）
    assert.ok(!md.includes("第一行\n"), "明细值不得包含真实换行");
    assert.ok(!md.includes("错误A\n"), "失败原因不得包含真实换行");
    assert.ok(!md.includes("警告B\n"), "警告不得包含真实换行");
});

test("Markdown 报告值拼接转义：反斜杠先行转义，字面量与转义标记不混淆", () => {
    const report = {
        steps: [failedStep({
            assertions: [{
                name: "path",
                passed: false,
                expected: "C:\\dir",
                actual: "x",
                detail: [{ index: 0, actual: "x", assertions: [{ name: "eq", passed: false, expected: "C:\\dir", actual: "x" }] }]
            }]
        })]
    };
    const md = buildMarkdownReport(report);
    // 值内字面反斜杠翻倍为 \\，与换行标记 \n 区分，避免「值以反斜杠结尾 + 换行」歧义
    assert.ok(md.includes("期望 C:\\\\dir,实得 x"), "字面反斜杠应翻倍");
});

// 嵌套 each 失败明细的最小形状（引擎 evaluateAssertion 对子断言递归求值产出，
// 子 each 断言自带各自的 detail）：list[0].items[1].qty = 9 违反 lte 5
function nestedDetail() {
    return [{
        index: 0,
        actual: { items: [{ qty: 1 }, { qty: 9 }] },
        assertions: [{
            name: "items",
            passed: false,
            expected: { path: "qty", lte: 5 },
            actual: [{ qty: 1 }, { qty: 9 }],
            detail: [{
                index: 1,
                actual: { qty: 9 },
                assertions: [{ name: "qty", passed: false, expected: 5, actual: 9 }]
            }]
        }]
    }];
}

test("Markdown 报告递归展开嵌套 each 明细（路径 › 串联，缩进逐层加深）", () => {
    const report = {
        steps: [failedStep({
            assertions: [{ name: "list 逐项校验", passed: false, expected: { path: "items", each: { path: "qty", lte: 5 } }, actual: [], detail: nestedDetail() }]
        })]
    };
    const md = buildMarkdownReport(report);
    // 第一层明细保持既有格式（4 空格缩进），扁平场景输出不变
    assert.match(md, /^    - 第 1 项失败: 期望 \{"path":"qty","lte":5\},实得 /m);
    // 嵌套层：外层第 1 项的内层第 2 项（1 基序号），8 空格缩进
    assert.match(md, /^        - 第 1 项 › 第 2 项失败: 期望 5,实得 9$/m);
});

test("Markdown 报告明细行极性：失败断言透出、通过断言不透出", () => {
    const failed = buildMarkdownReport({ steps: [failedStep({ assertions: [{ name: "a", passed: false, expected: 1, actual: 2, detail: nestedDetail() }] })] });
    assert.match(failed, /- 第 1 项失败: /);
    // 引擎契约：通过断言不挂 detail；此处同时锁定渲染端不凭空产出明细行
    const passed = buildMarkdownReport({ steps: [failedStep({ passed: true, assertions: [{ name: "a", passed: true, expected: 1, actual: 1 }] })] });
    assert.doesNotMatch(passed, /项失败: /);
});

test("断言表明细行 eachDetailRows 递归展开且只含失败子断言", () => {
    const html = eachDetailRows(nestedDetail(), "");
    assert.ok(html.includes("↳ 第 1 项</td>"), "应有一层明细行");
    assert.ok(html.includes("↳ 第 1 项 › 第 2 项</td>"), "应有嵌套明细行");
    assert.ok(html.includes("text-rose-900\">9</td>"), "内层实际值应出现");
    // 通过的子断言不产生行（判别用例：只过滤一层的实现会多出行）
    const mixed = [{
        index: 0,
        actual: 1,
        assertions: [
            { name: "pass", passed: true, expected: 1, actual: 1 },
            { name: "fail", passed: false, expected: 2, actual: 3 }
        ]
    }];
    const mixedHtml = eachDetailRows(mixed, "");
    assert.equal(mixedHtml.split("<tr").length - 1, 1, "通过子断言不产生明细行");
    // 无明细时输出空串（通过断言路径）
    assert.equal(eachDetailRows(undefined, ""), "");
});

test("Markdown 报告透出断言失败原因（顶层与 each 子断言，值经转义）", () => {
    const reason = "includes 不支持对象类型的实际值：请改用 equals 或 path 断言";
    const report = {
        steps: [failedStep({
            assertions: [
                { name: "对象包含", passed: false, expected: { a: 1 }, actual: { a: 1 }, reason },
                {
                    name: "逐项",
                    passed: false,
                    expected: { path: "obj", includes: { a: 1 } },
                    actual: [],
                    detail: [{
                        index: 0,
                        actual: { obj: { a: 1 } },
                        assertions: [{ name: "obj", passed: false, expected: { a: 1 }, actual: { a: 1 }, reason }]
                    }]
                }
            ]
        })]
    };
    const md = buildMarkdownReport(report);
    // 顶层断言原因 4 空格缩进；each 子断言原因在其明细行下再缩进一级
    assert.match(md, new RegExp(`^    - 原因: ${reason}$`, "m"));
    assert.match(md, new RegExp(`^        - 原因: ${reason}$`, "m"));
    assert.equal(md.split("原因: ").length - 1, 2, "仅携带 reason 的断言产生原因行");

    const html = eachDetailRows(report.steps[0].assertions[1].detail, "");
    assert.ok(html.includes("原因: " + reason), "each 明细 HTML 应透出失败原因");
});

test("Markdown 报告代码围栏自适应：内容无反引号时保持三反引号（既有格式不变）", () => {
    const report = {
        steps: [failedStep({
            response: { headers: { "content-type": "application/json" }, bodyText: "{\"ok\":true}" }
        })]
    };
    const md = buildMarkdownReport(report);
    assert.ok(md.includes("```json\n{\n  \"content-type\": \"application/json\"\n}\n```"), "响应头围栏保持 3 个反引号");
    assert.ok(md.includes("```\n{\"ok\":true}\n```"), "响应体围栏保持 3 个反引号");
});

test("Markdown 报告代码围栏自适应：响应体含反引号序列时围栏加长且内容原样保留", () => {
    const body = "示例\n```\ncode\n```\n结束";
    const md = buildMarkdownReport({ steps: [failedStep({ response: { bodyText: body } })] });
    // 最长反引号序列 3 → 围栏升级为 4；内容原样（不转义/不改写，复制用途保留完整内容）
    assert.ok(md.includes("````\n" + body + "\n````"), "围栏应升级为 4 个反引号且响应体原样");
    // 更长序列：5 个反引号 → 围栏 6（判别用例：固定 3 或固定 4 的实现均失败）
    const longBody = "`````\n五连反引号\n`````";
    const md2 = buildMarkdownReport({ steps: [failedStep({ response: { bodyText: longBody } })] });
    assert.ok(md2.includes("``````\n" + longBody + "\n``````"), "围栏应随最长序列升级为 6 个反引号");
});

test("Markdown 报告代码围栏自适应：响应头含反引号时 json 围栏同样加长", () => {
    const md = buildMarkdownReport({ steps: [failedStep({ response: { headers: { "x-note": "```" } } })] });
    assert.ok(md.includes("````json\n"), "带 json 标记的围栏应升级为 4 个反引号");
    assert.ok(md.includes("\n````\n"), "闭合围栏同为 4 个反引号");
});

test("Markdown 报告代码 span：普通场景文件与请求保持单反引号，Windows 路径反斜杠原样", () => {
    const md = buildMarkdownReport({ scenarioFile: "scenarios/a.js", steps: [failedStep()] });
    assert.ok(md.includes("- **场景文件**: `scenarios/a.js`\n"), "普通场景文件应为单反引号");
    assert.ok(md.includes("- **请求**: `GET /list`\n"), "普通请求应为单反引号");
    const win = buildMarkdownReport({ scenarioFile: "D:\\suite\\a.js", steps: [failedStep()] });
    assert.ok(win.includes("- **场景文件**: `D:\\suite\\a.js`\n"), "Windows 路径反斜杠不得加倍");
});

[
    ["a`b", "``a`b``"],
    ["a```b", "````a```b````"],
    ["a`````b", "``````a`````b``````"]
].forEach(([content, span]) => {
    test(`Markdown 报告代码 span 定界符随最长反引号序列自适应：${JSON.stringify(content)}`, () => {
        const md = buildMarkdownReport({ scenarioFile: content, steps: [failedStep()] });
        assert.ok(md.includes("- **场景文件**: " + span + "\n"), "定界符应为最长连续反引号 + 1");
    });
});

[
    ["`x", "`` `x ``"],
    ["x`", "`` x` ``"],
    ["``", "``` `` ```"],
    [" a ", "`  a  `"],
    [" a", "` a`"],
    ["a ", "`a `"],
    ["   ", "`   `"]
].forEach(([content, span]) => {
    test(`Markdown 报告代码 span 首尾反引号与空格按 CommonMark 边界补空格：${JSON.stringify(content)}`, () => {
        const md = buildMarkdownReport({ scenarioFile: content, steps: [failedStep()] });
        assert.ok(md.includes("- **场景文件**: " + span + "\n"), "补空格规则应与设计一致");
    });
});

[
    ["a\r\nb", "a\\nb"],
    ["a\rb", "a\\nb"],
    ["a\nb", "a\\nb"]
].forEach(([raw, shown]) => {
    test(`Markdown 报告场景文件与请求的换行折叠为字面量 \\n：${JSON.stringify(raw)}`, () => {
        const md = buildMarkdownReport({ scenarioFile: raw, steps: [failedStep({ path: "/x" + raw })] });
        const lines = md.split("\n");
        assert.ok(lines.includes("- **场景文件**: `" + shown + "`"), "场景文件应单行且为字面量 \\n");
        assert.ok(lines.includes("- **请求**: `GET /x" + shown + "`"), "请求应单行且为字面量 \\n");
        assert.ok(!md.includes("\r"), "不得残留真实回车");
    });
});

test("Markdown 报告元数据（标题/环境/模式）换行与伪标题列表保持单行", () => {
    const md = buildMarkdownReport({
        title: "T\r\n## 伪标题\n- 伪列表",
        environment: "dev\r- 伪",
        executionMode: "a\n- b",
        steps: []
    });
    const lines = md.split("\n");
    assert.equal(lines[0], "# T\\n## 伪标题\\n- 伪列表", "标题应单行");
    assert.ok(lines.includes("- **测试环境**: dev\\n- 伪"), "环境应单行");
    assert.ok(lines.includes("- **执行模式**: a\\n- b"), "执行模式应单行");
});

test("Markdown 报告步骤名/错误/警告/each 明细的单 CR 折叠为字面量 \\n", () => {
    const md = buildMarkdownReport({
        steps: [failedStep({
            name: "n\rx",
            error: "e\rx",
            warnings: ["w\rx"],
            assertions: [{
                name: "an\rx",
                passed: false,
                expected: 1,
                actual: "a\rb",
                detail: [{ index: 0, actual: "a\rb", assertions: [{ name: "eq", passed: false, expected: 1, actual: "a\rb" }] }]
            }]
        })]
    });
    assert.ok(md.includes("步骤 1: n\\nx"), "步骤名应折叠");
    assert.ok(md.includes("失败原因**: e\\nx"), "失败原因应折叠");
    assert.ok(md.includes("警告**: w\\nx"), "警告应折叠");
    assert.ok(md.includes("  - [ ] an\\nx"), "断言名应折叠");
    assert.ok(md.includes("期望 1,实得 a\\nb"), "each 明细应折叠");
    assert.ok(!md.includes("\r"), "不得残留真实回车");
});

[
    ["/a`b", "``GET /a`b``"],
    ["/a```b", "````GET /a```b````"],
    ["/a`````b", "``````GET /a`````b``````"],
    ["/a`", "`` GET /a` ``"]
].forEach(([path, span]) => {
    test(`Markdown 报告请求行代码 span 随 path 反引号自适应：${JSON.stringify(path)}`, () => {
        const md = buildMarkdownReport({ steps: [failedStep({ path })] });
        assert.ok(md.includes("- **请求**: " + span + "\n"), "请求行定界与补空格应与设计一致");
    });
});

test("Markdown 报告行内正文的反引号转义为字面量：奇数个不再吞掉后续文本", () => {
    // 奇数个反引号在行内正文中会被当作未闭合代码 span 起点，把后续文本整段吞进代码
    // （判别用例：未转义实现输出 "- **警告**: 变量 `a 缺失"，奇数定界符破坏报告结构）
    const md = buildMarkdownReport({
        steps: [failedStep({
            name: "步骤 `A",
            error: "错误 `B",
            warnings: ["变量 `a 缺失"],
            assertions: [{ name: "字段 `x 存在", passed: false, expected: "e`1", actual: "a`2",
                detail: [{ index: 0, actual: "a`2", assertions: [{ name: "eq", passed: false, expected: "e`1", actual: "a`2" }] }] }]
        })]
    });
    assert.ok(md.includes("步骤 1: 步骤 \\`A"), "步骤名反引号应转义");
    assert.ok(md.includes("失败原因**: 错误 \\`B"), "失败原因反引号应转义");
    assert.ok(md.includes("警告**: 变量 \\`a 缺失"), "警告反引号应转义");
    assert.ok(md.includes("  - [ ] 字段 \\`x 存在"), "断言名反引号应转义");
    assert.ok(md.includes("期望 e\\`1,实得 a\\`2"), "each 明细值反引号应转义");
    // 承载用户值的行不得残留裸反引号（mdCode 生成的行内代码 span 是报告里合法使用反引号的位置）
    const valueLines = md.split("\n").filter((line) => /步骤 \\`A|错误 \\`B|变量 \\`a|字段 \\`x|e\\`1/.test(line));
    assert.equal(valueLines.length, 5, "五处承载用户值的行都应存在");
    for (const line of valueLines) {
        const bare = (line.match(/(^|[^\\])`/g) || []).length;
        assert.equal(bare, 0, `承载用户值的行不得残留裸反引号: ${line}`);
    }
});

test("Markdown 报告行内正文反引号转义：多连反引号与已有反斜杠不互相干扰", () => {
    const md = buildMarkdownReport({
        steps: [failedStep({ warnings: ["路径 C:\\a\\b 与 ``` 片段"] })]
    });
    // 反斜杠先双写，反引号各自独立转义，互不干扰
    assert.ok(md.includes("警告**: 路径 C:\\\\a\\\\b 与 \\`\\`\\` 片段"), "反斜杠双写与反引号转义可共存");
});

test("Markdown 报告行内正文无反引号时输出不变（既有格式锁定）", () => {
    const md = buildMarkdownReport({
        steps: [failedStep({ name: "查列表", error: "错误A", warnings: ["警告B"] })]
    });
    assert.ok(md.includes("步骤 1: 查列表"), "普通步骤名不变");
    assert.ok(md.includes("失败原因**: 错误A"), "普通失败原因不变");
    assert.ok(md.includes("警告**: 警告B"), "普通警告不变");
    assert.ok(!md.includes("\\`"), "无反引号输入不得产出转义序列");
});

test("Markdown 报告元数据同时含字面 \\n 与真实换行：字面反斜杠双写，换行为单反斜杠 n", () => {
    const md = buildMarkdownReport({
        title: "T\\n\nX",
        environment: "dev\\n\n- 伪",
        executionMode: "a\\n\n- b",
        steps: []
    });
    const lines = md.split("\n");
    assert.equal(lines[0], "# T\\\\n\\nX", "标题字面反斜杠双写、真实换行单反斜杠 n");
    assert.ok(lines.includes("- **测试环境**: dev\\\\n\\n- 伪"), "环境字面反斜杠双写、真实换行单反斜杠 n");
    assert.ok(lines.includes("- **执行模式**: a\\\\n\\n- b"), "模式字面反斜杠双写、真实换行单反斜杠 n");
});

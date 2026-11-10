import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { spawn } from "node:child_process";
import { evaluateAssertion, applyExtract } from "../src/core.js";
import { defineScenario } from "../src/registry.js";
import { structuralDiff, renderStructuralDiff } from "../src/utils/structural-diff.js";
import { buildHtmlReport } from "../src/utils/html-report.js";
import { eachDetailRows } from "../src/browser/ui/ui-view.js";

test("#131 深嵌套叶子/类型/缺失字段差异与 HTML 安全", () => {
    const actual = { items: [{ n: 2, flag: "true", extra: "<script>alert(1)</script>" }] };
    const result = evaluateAssertion({ equals: { items: [{ n: 1, flag: true }] } }, { body: actual }, { vars: {} });
    assert.equal(result.passed, false);
    assert.deepEqual(result.diff.entries.map(x => x.path), ['$["items"][0]["n"]', '$["items"][0]["flag"]', '$["items"][0]["extra"]']);
    assert.equal(result.diff.entries[1].actualType, "string");
    assert.equal(result.diff.entries[2].expectedType, "missing");
    const html = renderStructuralDiff(result.diff);
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(!html.includes('<script>'));
    assert.ok(eachDetailRows([{ index: 0, assertions: [result] }]).includes('字段差异'));
    assert.equal(evaluateAssertion({ equals: { x: 1 } }, { body: { x: 1 } }, { vars: {} }).diff, undefined);
});

test("#131 大数组、超长值和深层结构的证据有界", () => {
    const diff = structuralDiff(Array.from({ length: 10000 }, () => 'a'.repeat(10000)), Array.from({ length: 10000 }, () => 'b'.repeat(10000)));
    assert.equal(diff.truncated, true);
    assert.equal(diff.entries.length, 50);
    assert.ok(JSON.stringify(diff).length < 40000);
    let a = 1, b = 2;
    for (let i = 0; i < 100; i++) { a = { a }; b = { a: b }; }
    assert.equal(structuralDiff(a, b).truncated, true);
});

test("#131 oneOf 标注候选；notEquals 相等失败；多操作符不伪造差异", () => {
    const runtime = { vars: {} };
    const one = evaluateAssertion({ oneOf: [{ x: 1 }, { x: 2 }] }, { body: { x: 3 } }, runtime);
    assert.equal(one.diff.entries.length, 2);
    assert.match(one.diff.entries[1].path, /候选 2/);
    const same = evaluateAssertion({ notEquals: { x: 1 } }, { body: { x: 1 } }, runtime);
    assert.match(same.diff.entries[0].path, /实际相等/);
    const mixed = evaluateAssertion({ equals: 1, gt: 2 }, { body: 1 }, runtime);
    assert.equal(mixed.passed, false);
    assert.equal(mixed.diff, undefined);
});

test("#134 duration 目标复用毫秒值，缺失遵循 required/default", () => {
    const step = { extract: [{ name: 'elapsed', target: 'duration', required: true }] };
    defineScenario({ name: '耗时', steps: [{ name: '请求', path: '/', ...step }] });
    const runtime = { vars: {} };
    assert.equal(applyExtract(step, { body: {}, durationMs: 12.5 }, runtime).failures.length, 0);
    assert.equal(runtime.vars.elapsed, 12.5);
    assert.equal(applyExtract(step, { body: {} }, runtime).failures.length, 1);
    applyExtract({ extract: [{ name: 'elapsed', target: 'duration', default: 0 }] }, { body: {} }, runtime);
    assert.equal(runtime.vars.elapsed, 0);
});

test("#133 离线报告区分跳过、取消、未执行并转义响应值", () => {
    const html = buildHtmlReport([{ scenarioId: '<script>', status: 'CANCELLED', results: [{ name: '取消', cancelled: true }, { name: '跳过', skipped: true }], unexecuted: [{ name: '没跑' }] }]);
    assert.ok(html.includes('CANCELLED'));
    assert.ok(html.includes('SKIP'));
    assert.ok(html.includes('未执行：没跑'));
    assert.ok(!html.includes('<script>'));
    assert.ok(!/src=|href=/.test(html));
});

test("#133 CLI 成功+失败同时导出 JSON/JUnit/HTML，失败退出码及脱敏保持", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'st-report-'));
    const secret = 'sensitive-token-131-134';
    const server = http.createServer((req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ n: 2, token: secret }));
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
        const baseUrl = `http://127.0.0.1:${server.address().port}`;
        fs.writeFileSync(path.join(dir, 'config.js'), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({baseUrl:${JSON.stringify(baseUrl)},vars:{token:${JSON.stringify(secret)}},scenarios:[{id:'ok',url:'ok.js'},{id:'bad',url:'bad.js'}]}));`);
        for (const [id, n] of [['ok', 2], ['bad', 1]]) fs.writeFileSync(path.join(dir, id + '.js'), `ScenarioTest.registerScenario('${id}',ScenarioTest.defineScenario({name:'${id}',steps:[{name:'check',path:'/',assertions:[{equals:{n:${n},token:'{{vars.token}}'}}],extract:[{name:'elapsed',target:'duration',required:true}]}]}));`);
        const output = await new Promise((resolve, reject) => {
            const child = spawn(process.execPath, ['src/cli.js', 'run', '--config', path.join(dir, 'config.js'), '--all', '--json', '--junit', path.join(dir, 'out.xml'), '--report', path.join(dir, 'out.html')]);
            let stdout = '', stderr = '';
            child.stdout.on('data', c => stdout += c);
            child.stderr.on('data', c => stderr += c);
            child.on('error', reject);
            child.on('close', code => resolve({ code, stdout, stderr }));
        });
        assert.equal(output.code, 1, output.stderr);
        const json = JSON.parse(output.stdout);
        assert.equal(json.scenarios.length, 2);
        assert.equal(json.scenarios[0].results[0].passed, true);
        assert.equal(json.scenarios[1].results[0].passed, false);
        assert.equal(typeof json.scenarios[0].vars.elapsed, 'number');
        assert.ok(json.scenarios[1].results[0].assertions[0].diff.entries.length);
        const html = fs.readFileSync(path.join(dir, 'out.html'), 'utf8');
        assert.ok(html.includes('PASS') && html.includes('FAIL') && html.includes('字段差异'));
        assert.ok(!html.includes(secret));
        assert.ok(!output.stdout.includes(secret));
        assert.match(fs.readFileSync(path.join(dir, 'out.xml'), 'utf8'), /<failure/);
    } finally {
        await new Promise(resolve => server.close(resolve));
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test("#131 长字符串证据不复制敏感前缀，超长键保持预算", () => {
    const secret = 'private-prefix-' + 'x'.repeat(500);
    assert.ok(!JSON.stringify(structuralDiff(secret, 'other')).includes('private-prefix'));
    assert.equal(structuralDiff({ ['x'.repeat(10000)]: 1 }, {}).truncated, true);
});

test("#131 length 组合保留原始比较证据与结果 actual 语义", () => {
    const run = (definition, value) => evaluateAssertion({ path: 'v', ...definition }, { body: { v: value } }, { vars: {} });
    const a = run({ equals: [1, 2, 3], length: 5 }, [1, 2, 3]);
    assert.equal(a.passed, false);
    assert.equal(a.actual, 3);
    assert.equal(a.diff, undefined);
    const b = run({ equals: 'abc', length: 3 }, 'abcd');
    assert.equal(b.passed, false);
    assert.equal(b.actual, 4);
    assert.equal(b.diff.entries[0].actual, 'abcd');
    const c = run({ equals: 4, length: 5 }, 'abcd');
    assert.equal(c.passed, false);
    assert.equal(c.actual, 4);
    assert.equal(c.diff.entries[0].expected, 4);
    assert.equal(c.diff.entries[0].actual, 'abcd');
    assert.equal(run({ notEquals: 'xyz', length: 5 }, 'abcd').diff, undefined);
    assert.match(run({ notEquals: 'abcd', length: 5 }, 'abcd').diff.entries[0].path, /实际相等/);
    assert.equal(run({ oneOf: ['abcd'], length: 5 }, 'abcd').diff, undefined);
    const one = run({ oneOf: [4, 'abc'], length: 5 }, 'abcd');
    assert.equal(one.diff.entries.length, 2);
    assert.ok(one.diff.entries.every(entry => entry.actual === 'abcd'));
});

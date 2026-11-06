import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createEngine } from '../src/engine.js';
import { cliEntry, makeTempDir, removeDir, runCli, scenarioSource, writeProject } from './fixtures/comprehensive/cli-harness.mjs';

const apiKey = 'fixture-api-13579';
const password = 'fixture-pass-24680';
const auth = 'Bearer fixture-auth-98765';
const token = 'fixture-token-54321';
const special = '敏感-fixture-"slash\\line\n末尾-75319';

function noSecret(output, secret, where) {
    let variant = secret;
    for (let depth = 0; depth < 4; depth++) {
        assert.ok(!output.includes(variant), `${where}: 第 ${depth} 次 JSON 转义值泄漏`);
        const xml = variant.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
        assert.ok(!output.includes(xml), `${where}: XML/HTML 转义值泄漏`);
        variant = JSON.stringify(variant).slice(1, -1);
    }
}

async function setup(t, scenarios) {
    const hits = [];
    const service = http.createServer(async (req, res) => {
        const chunks = []; for await (const chunk of req) chunks.push(chunk);
        const body = Buffer.concat(chunks).toString();
        hits.push({ headers: req.headers, body, path: req.url });
        if (req.url === '/disconnect') { req.socket.destroy(); return; }
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(req.url === '/seed' ? { value: 'fixture-dynamic-49268' } : { echo: `${req.headers['x-api-key']}|${req.headers.authorization}|${body}`, safe: 'visible-control' }));
    });
    await new Promise(resolve => service.listen(0, '127.0.0.1', resolve));
    const dir = makeTempDir('coverage-fixes-');
    t.after(async () => { service.closeAllConnections(); await new Promise(resolve => service.close(resolve)); removeDir(dir); });
    const { configPath } = writeProject(dir, { envs: [{ key: 'local', name: 'Local', baseUrl: `http://127.0.0.1:${service.address().port}` }], scenarios });
    return { hits, dir, configPath };
}

test('首步网络错误重试的错误日志隐藏动态敏感请求值', async t => {
    const scenario = { name: '网络错误', generatedVars: [{ name: 'plain', type: 'enum', values: [special] }], steps: [{
        name: `失败-${special}`, method: 'POST', path: '/disconnect', request: { body: { password: '{{vars.plain}}' } },
        retryUntil: { maxAttempts: 2, intervalMs: 100, retryOn: ['error'] }
    }] };
    const ctx = await setup(t, [{ id: 'disconnect', source: scenarioSource('disconnect', scenario) }]);
    const result = await runCli(['run', '--config', ctx.configPath, '--all'], { home: ctx.dir });
    assert.equal(result.code, 1); assert.equal(ctx.hits.length, 2);
    assert.equal(JSON.parse(ctx.hits[0].body).password, special);
    assert.match(result.stdout, /\[RETRY\].*连接失败/);
    noSecret(result.stdout, special, '连接失败 stdout'); noSecret(result.stderr, special, '连接失败 stderr');
});

test('重试上下文仅内部开关提供，默认调用和判定语义保持', async t => {
    const ctx = await setup(t, []);
    const config = fs.readFileSync(ctx.configPath, 'utf8');
    const target = /http:\/\/127\.0\.0\.1:\d+/.exec(config)[0];
    const scenario = { name: '兼容', vars: { plain: special }, steps: [{ name: '重试', method: 'POST', path: '/echo', request: { body: { password: '{{vars.plain}}' } }, retryUntil: { maxAttempts: 2, intervalMs: 100 }, assertions: [{ path: 'safe', equals: 'never' }] }] };
    let defaultCount = 0; const engine = createEngine({ baseUrl: target });
    const ordinary = await engine.runScenario(scenario, { onAttempt: function () { defaultCount = arguments.length; } });
    let context; const detailed = await engine.runScenario(scenario, { _includeAttemptContext: true, onAttempt: function (_info, ctx) { context = ctx; } });
    assert.equal(defaultCount, 1); assert.equal(ordinary.status, 'FAILED'); assert.equal(detailed.status, ordinary.status);
    assert.equal(context.runtime.vars.plain, special); assert.equal(context.request.body.password, special);
});

test('bail 多行数据 JUnit 包含所有未执行场景及全局计数', async t => {
    const fail = { name: '失败', steps: [{ name: '状态失败', path: '/fail', status: 201 }] };
    const next = { name: '后续', steps: [{ name: '不可执行', path: '/forbidden' }] };
    const ctx = await setup(t, [{ id: 'first', source: scenarioSource('first', fail) }, { id: 'second', source: scenarioSource('second', next) }]);
    const dataset = path.join(ctx.dir, 'rows.json'); fs.writeFileSync(dataset, JSON.stringify([{ row: 1 }, { row: 2 }]));
    const junit = path.join(ctx.dir, 'junit.xml');
    const result = await runCli(['run', '--config', ctx.configPath, '--all', '--data', dataset, '--bail', '--junit', junit], { home: ctx.dir });
    assert.equal(result.code, 1, result.stderr);
    assert.deepEqual(ctx.hits.map(hit => hit.path), ['/fail']);
    const xml = fs.readFileSync(junit, 'utf8');
    assert.match(xml, /<testsuites[^>]* tests="4" failures="1" skipped="3"/);
    for (const id of ['second#row-1', 'first#row-2', 'second#row-2']) assert.ok(xml.includes(id), `JUnit 缺失 ${id}`);
});

test('动态提取值作为敏感请求体时 retry 日志不得泄漏', async t => {
    const secret = 'fixture-dynamic-49268';
    const scenario = { name: '动态请求', steps: [
        { name: '提取', path: '/seed', extract: [{ name: 'ordinaryId', path: 'value' }] },
        { name: '重试', method: 'POST', path: '/echo', request: { body: { password: '{{vars.ordinaryId}}' } },
          retryUntil: { maxAttempts: 2, intervalMs: 100 }, assertions: [{ name: `失败-${secret}`, path: 'safe', equals: 'incorrect' }] }
    ] };
    const ctx = await setup(t, [{ id: 'dynamic', source: scenarioSource('dynamic', scenario) }]);
    const result = await runCli(['run', '--config', ctx.configPath, '--all'], { home: ctx.dir });
    assert.equal(result.code, 1); assert.equal(JSON.parse(ctx.hits[1].body).password, secret);
    assert.match(result.stdout, /\[RETRY\]/);
    assert.ok(!result.stdout.includes(secret), 'RETRY 输出泄漏动态请求中的敏感值');
});

test('字面请求敏感值在 retry、失败诊断和全部报告隐藏，实际请求保持原值', async t => {
    const scenario = { name: '回显', steps: [{ name: '请求', method: 'POST', path: '/echo', request: {
        headers: { 'X-Api-Key': apiKey, Authorization: auth }, body: { password, nested: { token }, label: 'visible-control' }
    }, retryUntil: { maxAttempts: 2, intervalMs: 100 }, assertions: [{ name: `断言 ${apiKey}`, path: 'echo', equals: 'no-match' }] }] };
    const ctx = await setup(t, [{ id: 'echo', source: scenarioSource('echo', scenario) }]);
    const junit = path.join(ctx.dir, 'report.xml'); const html = path.join(ctx.dir, 'report.html');
    const result = await runCli(['run', '--config', ctx.configPath, '--all', '--json', '--junit', junit, '--report', html], { home: ctx.dir });
    assert.equal(result.code, 1, result.stderr); assert.equal(ctx.hits.length, 2);
    assert.equal(ctx.hits[0].headers['x-api-key'], apiKey); assert.equal(ctx.hits[0].headers.authorization, auth);
    assert.equal(JSON.parse(ctx.hits[0].body).password, password);
    assert.equal(JSON.parse(ctx.hits[0].body).nested.token, token);
    const outputs = [result.stdout, result.stderr, fs.readFileSync(junit, 'utf8'), fs.readFileSync(html, 'utf8')];
    assert.match(result.stderr, /\[RETRY\]/); assert.match(result.stderr, /visible-control/);
    for (const output of outputs) for (const secret of [apiKey, password, auth, token]) assert.ok(!output.includes(secret), `输出泄漏 ${secret}`);
    assert.ok(JSON.parse(result.stdout));
    const textMode = await runCli(['run', '--config', ctx.configPath, '--all'], { home: ctx.dir });
    assert.equal(textMode.code, 1); assert.match(textMode.stdout, /\[RETRY\]/); assert.match(textMode.stdout, /visible-control/);
    for (const output of [textMode.stdout, textMode.stderr]) for (const secret of [apiKey, password, auth, token]) assert.ok(!output.includes(secret), `文本模式泄漏 ${secret}`);
});

for (const source of ['vars', 'generatedVars']) {
    test(`首步 ${source} 特殊字符回显：所有报告及首次重试不泄漏`, async t => {
        const scenario = {
            name: `回显-${special}`,
            ...(source === 'vars' ? { vars: { plain: special } } : { generatedVars: [{ name: 'plain', type: 'enum', values: [special] }] }),
            steps: [{ name: '首步重试', method: 'POST', path: '/echo', request: { body: { password: '{{vars.plain}}', label: 'visible-control' } },
                retryUntil: { maxAttempts: 2, intervalMs: 100 }, assertions: [{ name: `断言-${special}`, path: 'echo', equals: 'mismatch' }] }]
        };
        const ctx = await setup(t, [{ id: 'special', source: scenarioSource('special', scenario) }]);
        const junit = path.join(ctx.dir, 'junit.xml'); const html = path.join(ctx.dir, 'report.html');
        const result = await runCli(['run', '--config', ctx.configPath, '--all', '--json', '--junit', junit, '--report', html], { home: ctx.dir });
        assert.equal(result.code, 1); assert.equal(ctx.hits.length, 2);
        assert.equal(JSON.parse(ctx.hits[0].body).password, special);
        assert.match(result.stderr, /\[RETRY\]/); assert.match(result.stderr, /visible-control/);
        for (const [name, output] of [['stdout', result.stdout], ['stderr', result.stderr], ['JUnit', fs.readFileSync(junit, 'utf8')], ['HTML', fs.readFileSync(html, 'utf8')]]) {
            noSecret(output, special, name);
            assert.match(output, /visible-control/, `${name}: 非敏感对照应保留`);
        }
        const plain = await runCli(['run', '--config', ctx.configPath, '--all'], { home: ctx.dir });
        assert.equal(plain.code, 1); assert.match(plain.stdout, /\[RETRY\]/);
        noSecret(plain.stdout, special, 'text stdout'); noSecret(plain.stderr, special, 'text stderr');
    });
}

test('serve --reassign：占用已登记端口后分配新端口、更新登记并可请求', async t => {
    const scenario = { name: '占位', steps: [{ name: '探活', path: '/ok' }] };
    const ctx = await setup(t, [{ id: 'one', source: scenarioSource('one', scenario) }]);
    const blocker = http.createServer((req, res) => res.end('occupied'));
    await new Promise(resolve => blocker.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => blocker.close(resolve)));
    const oldPort = blocker.address().port;
    const initial = await runCli(['projects', 'ensure', '--config', ctx.configPath, '--port', String(oldPort), '--json'], { home: ctx.dir });
    assert.equal(initial.code, 0, initial.stderr);
    const child = spawn(process.execPath, [cliEntry, 'serve', '--config', ctx.configPath, '--reassign'], { env: { ...process.env, SCENARIO_TEST_HOME: ctx.dir }, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    t.after(async () => {
        if (child.exitCode === null && child.signalCode === null) {
            const exited = once(child, 'exit'); child.kill(); await exited;
        }
    });
    const port = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`serve 启动超时 ${output}`)), 8000);
        const observe = chunk => { output += chunk; const match = /场景测试工作台: http:\/\/127\.0\.0\.1:(\d+)\//.exec(output); if (match) { clearTimeout(timer); resolve(Number(match[1])); } };
        child.stdout.on('data', observe); child.stderr.on('data', observe);
        child.once('error', reject); child.once('exit', code => { clearTimeout(timer); reject(new Error(`serve 提前退出 ${code}: ${output}`)); });
    });
    assert.notEqual(port, oldPort);
    const registry = JSON.parse((await runCli(['projects', 'list', '--json'], { home: ctx.dir })).stdout);
    assert.equal(registry.projects[0].port, port);
    const response = await fetch(`http://127.0.0.1:${port}/scenario.config.js`);
    assert.equal(response.status, 200); assert.match(await response.text(), /registerConfig/);
    assert.equal(await (await fetch(`http://127.0.0.1:${oldPort}/`)).text(), 'occupied');
});

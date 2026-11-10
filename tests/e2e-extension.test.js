import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { createE2eExtension, exactSpecPattern } from '../src/e2e/extension.js';
import { createE2eProjectFiles } from '../src/e2e/templates.js';
import { E2E_REPORTER } from '../src/e2e/reporter-template.js';
import { createServeServer } from '../src/cli/serve-server.js';
import { spawnSync } from 'node:child_process';

test('初始化后的 E2E 在同一服务提供首页导航和身份', async t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scenario-e2e-serve-'));
    const init = spawnSync(process.execPath, [path.resolve('dist/scenario-test-cli.cjs'), 'init', '--project', root, '--e2e', '--no-input'], { encoding: 'utf8' });
    assert.equal(init.status, 0, init.stderr);
    const workspace = path.join(root, 'scenario-test');
    const probe = http.createServer();
    await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
    const port = probe.address().port;
    await new Promise(resolve => probe.close(resolve));
    const server = createServeServer({ workspace, libraryDist: path.resolve('dist'), port, config: { envs: [], baseUrl: '' }, defaultTarget: { key: 'default', envKey: 'default', target: '' }, extensions: [createE2eExtension({ workspace })] });
    await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
    t.after(async () => { await server.disposeExtensions(); await new Promise(resolve => server.close(resolve)); });
    const base = `http://127.0.0.1:${port}`;
    assert.match(await (await fetch(base + '/')).text(), /\/e2e\//);
    const status = await (await fetch(base + '/__scenario-test__/status')).json();
    assert.equal(status.workspace, workspace); assert.ok(status.extensions.includes('e2e'));
    assert.match(await (await fetch(base + '/e2e/')).text(), /测试文件/);
});

test('spec 匹配转义并固定路径，拒绝近似文件', () => {
    const root = path.join(os.tmpdir(), 'foo');
    const pattern = new RegExp(exactSpecPattern(root, 'tests/a.spec.js'));
    assert.match(path.join(root, 'tests/a.spec.js'), pattern);
    assert.doesNotMatch(path.join(root, 'tests/axspec.js'), pattern);
    assert.doesNotMatch(path.join(root, 'tests/a.spec.js.more'), pattern);
});

test('E2E 模板隔离 reporter 与项目配置，默认适配器拒绝假登录', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scenario-e2e-template-'));
    const files = createE2eProjectFiles('scenario-test');
    for (const [name, data] of Object.entries(files)) { const f = path.join(root, name); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, data); }
    const adapter = await import(new URL('file:///' + path.join(root, 'scenario-test/e2e/auth-adapter.js').replace(/\\/g, '/')).href);
    await adapter.login({ context: {}, account: '' });
    await assert.rejects(adapter.login({ context: {}, account: 'user' }), /实现项目认证/);
    const reporterFile = path.join(root, 'reporter.cjs'); fs.writeFileSync(reporterFile, E2E_REPORTER);
    assert.equal(typeof createRequire(import.meta.url)(reporterFile), 'function');
});

test('扩展拒绝非白名单和并发，停止后产生本轮中断结果', async t => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'scenario-e2e-run-'));
    const e2e = path.join(workspace, 'e2e');
    const testDir = path.join(e2e, 'tests'); fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(path.join(testDir, 'a.spec.js'), '');
    const cli = path.join(e2e, 'node_modules', '@playwright', 'test', 'cli.js');
    fs.mkdirSync(path.dirname(cli), { recursive: true });
    fs.writeFileSync(cli, "setInterval(() => {}, 1000)");
    const ext = createE2eExtension({ workspace });
    const server = http.createServer((req, res) => ext.handle(req, res, new URL(req.url, 'http://localhost').pathname));
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(async () => { await ext.dispose(); await new Promise(resolve => server.close(resolve)); });
    const base = `http://127.0.0.1:${server.address().port}`;
    const post = body => fetch(base + '/e2e/api/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal((await post({ spec: '../a.spec.js' })).status, 400);
    const run = await post({ spec: 'tests/a.spec.js' }); assert.equal(run.status, 202);
    const { runId } = await run.json(); assert.equal((await post({ spec: 'tests/a.spec.js' })).status, 409);
    const stopped = await fetch(base + '/e2e/api/stop', { method: 'POST' }); assert.equal(stopped.status, 202);
    let result;
    for (let i = 0; i < 100; i++) {
        result = await (await fetch(base + '/e2e/api/result?spec=tests%2Fa.spec.js')).json();
        if (result) break;
        await new Promise(resolve => setTimeout(resolve, 30));
    }
    assert.equal(result.runId, runId); assert.equal(result.results['tests/a.spec.js'][0].status, 'interrupted');
    assert.equal((await fetch(base + '/e2e/api/artifacts/' + runId + '/report/../../outside')).status, 404);
});

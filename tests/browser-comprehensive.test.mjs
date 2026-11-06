// 独立运行：node tests/browser-comprehensive.test.mjs
// 与既有浏览器测试相同的 SCENARIO_TEST_BROWSER_CHANNEL 配置；不读取凭据、不修改 dist。
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { scenarios, special } from './fixtures/browser-comprehensive/scenarios.mjs';

const root = path.resolve(import.meta.dirname, '..');
const distMode = process.env.SCENARIO_TEST_BROWSER_RUNTIME === 'dist';
const artifacts = path.join(root, 'tests/fixtures/browser-comprehensive/artifacts', distMode ? 'dist' : 'src');
fs.mkdirSync(artifacts, { recursive: true });
const evidence = { runtime: distMode ? 'dist/scenario-test.umd.js（现有文件）' : 'src/index.js 内存打包，使用仓库已有 tailwind.generated.js；非 dist 验收', checks: [] };
const servers = [];
const hits = [];
let browser;
async function listen(handler) {
    const server = http.createServer(handler);
    servers.push(server);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    return `http://127.0.0.1:${server.address().port}`;
}
async function check(name, fn) {
    try { await fn(); evidence.checks.push({ name, passed: true }); console.log(`PASS ${name}`); }
    catch (error) { evidence.checks.push({ name, passed: false, error: error.stack }); throw error; }
}
function noSecret(text, secret, label) {
    let variant = secret;
    for (let depth = 0; depth < 4; depth++) {
        assert.ok(!text.includes(variant), `${label}: 第 ${depth} 次 JSON 转义值泄漏`);
        variant = JSON.stringify(variant).slice(1, -1);
    }
}
try {
    const targets = [];
    for (const env of ['a', 'b']) targets.push(await listen(async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', '*');
        if (req.method === 'OPTIONS') { res.end(); return; }
        const chunks = []; for await (const chunk of req) chunks.push(chunk);
        const body = Buffer.concat(chunks).toString();
        const url = new URL(req.url, 'http://fixture');
        if (url.pathname === '/echo') hits.push({ env, path: url.pathname, method: req.method, apiKey: req.headers['x-api-key'], body });
        else
        hits.push({ env, path: url.pathname, method: req.method });
        const count = hits.filter(h => h.env === env && h.path === url.pathname).length;
        const data = url.pathname === '/echo' ? { echo: `${req.headers['x-api-key']}|${body}`, safe: 'visible-control' }
            : url.pathname === '/seed' ? { id: 'fixture-42' }
            : url.pathname === '/retry' ? { ready: count >= 3 }
            : url.pathname === '/never' ? { ready: false }
            : url.pathname === '/nested' ? { data: { items: [{ name: 'actual' }] } }
            : { ok: true, env };
        const send = () => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
        if (url.pathname === '/slow') setTimeout(send, 1500).unref(); else send();
    }));
    const runtimeText = distMode ? fs.readFileSync(path.join(root, 'dist/scenario-test.umd.js'), 'utf8') : (await build({ entryPoints: [path.join(root, 'src/index.js')], bundle: true, format: 'iife', globalName: 'ScenarioTest', write: false })).outputFiles[0].text;
    evidence.bundleBytes = Buffer.byteLength(runtimeText);
    const config = { envs: targets.map((baseUrl, i) => ({ key: ['a', 'b'][i], name: ['环境A', '环境B'][i], baseUrl })), defaultEnvKey: 'a', scenarios: Object.entries(scenarios).map(([id, s]) => ({ id, name: s.name, url: `cases/${id}.js` })) };
    const origin = await listen((req, res) => {
        const url = new URL(req.url, 'http://fixture');
        if (url.pathname === '/runtime.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(runtimeText); return; }
        const id = /^\/cases\/(.+)\.js$/.exec(url.pathname)?.[1];
        if (id) { res.setHeader('Content-Type', 'text/javascript'); res.end(`ScenarioTest.registerScenario(${JSON.stringify(id)}, ScenarioTest.defineScenario(${JSON.stringify(scenarios[id])}));`); return; }
        const selected = url.searchParams.has('invalid') ? { ...config, envs: 'invalid-envs' } : url.searchParams.has('empty') ? { ...config, scenarios: [] } : config;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(`<!doctype html><html lang="zh-CN"><body><div id="app" style="height:100vh"></div><script src="/runtime.js"></script><script>ScenarioTest.createApp({mount:'#app',config:${JSON.stringify(selected)}});</script></body></html>`);
    });
    const channel = process.env.SCENARIO_TEST_BROWSER_CHANNEL;
    browser = await chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.setDefaultTimeout(7000);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(origin);
    await page.waitForSelector('#stepsList li');
    const select = async id => {
        await page.locator(`[data-scenario-file="cases/${id}.js"]`).click();
        await page.waitForFunction(name => document.querySelector('#scenarioTitle').textContent.includes(name), scenarios[id].name);
    };
    const run = async (button = '#runBtn') => {
        await page.locator(button).click();
        await page.waitForFunction(() => !document.querySelector('#runBtn').disabled && !document.querySelector('#stepBtn').disabled);
    };
    const count = selector => page.locator(`#stepsList li${selector}`).count();
    await select('flow');
    await check('正例：all变量传递和环境A实际到达', async () => {
        await run(); assert.equal(await count('[data-passed="true"]'), 2);
        assert.deepEqual(hits.map(h => [h.env, h.path]), [['a', '/seed'], ['a', '/use/fixture-42/fixture-42']]);
    });
    await check('正例：环境B切换与step逐步执行', async () => {
        await page.locator('#environmentSelect').selectOption('b');
        await page.locator('#resetBtn').click();
        const before = hits.length;
        await run('#stepBtn'); assert.equal(hits.length, before + 1);
        await run('#stepBtn'); assert.equal(await count('[data-passed="true"]'), 2);
        assert.deepEqual(hits.slice(before).map(h => [h.env, h.path]), [['b', '/seed'], ['b', '/use/fixture-42/fixture-42']]);
    });
    await check('反例：stop禁止副作用且always清理', async () => {
        await select('stop'); const before = hits.length; await run();
        assert.equal(await count('[data-passed="false"]'), 1);
        assert.equal(await count('[data-skipped="true"]'), 1);
        assert.match(await page.locator('#stepsList').textContent(), /201/);
        assert.deepEqual(hits.slice(before).map(h => h.path), ['/fail', '/cleanup']);
        await page.screenshot({ path: path.join(artifacts, 'stop-always.png'), fullPage: true });
    });
    await check('边界：新运行变量隔离与条件SKIP', async () => {
        await select('skip'); const before = hits.length; await run();
        assert.equal(await count('[data-skipped="true"]'), 1);
        assert.deepEqual(hits.slice(before).map(h => h.path), ['/ok']);
    });
    await check('正反例：retry成功和耗尽精确请求次数', async () => {
        await select('retry'); await run(); assert.equal(await count('[data-passed="true"]'), 1);
        assert.equal(hits.filter(h => h.path === '/retry').length, 3);
        await select('exhausted'); await run(); assert.equal(await count('[data-passed="false"]'), 1);
        assert.match(await page.locator('#stepsList').textContent(), /ready/);
        assert.equal(hits.filter(h => h.path === '/never').length, 2);
    });
    await check('反例：超时和取消原因及取消后无副作用', async () => {
        await select('timeout'); await run(); assert.match(await page.locator('#stepsList').textContent(), /TIMEOUT/);
        await select('cancel'); const before = hits.length;
        const arrived = page.waitForRequest(r => r.url().includes('/slow'));
        await page.locator('#runBtn').click(); await arrived;
        await page.locator('#cancelBtn').click();
        await page.waitForFunction(() => !document.querySelector('#runBtn').disabled);
        assert.match(await page.locator('#stepsList').textContent(), /用户已取消执行/);
        assert.ok(!hits.slice(before).some(h => h.path === '/forbidden'));
    });
    await check('反例：嵌套diff和length组合用户可见证据', async () => {
        await select('diff'); await run(); assert.equal(await count('[data-passed="false"]'), 2);
        await page.locator('#stepsList li').first().click();
        assert.match(await page.locator('.structural-diff').first().textContent(), /expected/);
        assert.match(await page.locator('.structural-diff').first().textContent(), /actual/);
        await page.screenshot({ path: path.join(artifacts, 'nested-length.png'), fullPage: true });
    });
    await check('反例：临时请求无效JSON不发请求', async () => {
        await page.locator('[data-adhoc-step="0"]').click();
        await page.locator('#adhocHeadersInput').fill('{broken');
        const before = hits.length; await page.locator('#adhocExecuteBtn').click();
        assert.match(await page.locator('#adhocError').textContent(), /请求头.*合法 JSON/);
        assert.equal(hits.length, before); assert.equal(await page.locator('#adhocDraftBtn').isDisabled(), true);
        await page.screenshot({ path: path.join(artifacts, 'invalid-json.png'), fullPage: true });
        await page.locator('#adhocCloseBtn').click();
    });
    await check('敏感请求回显：诊断与导出隐藏但服务收到原值', async () => {
        await select('sensitive'); await run();
        const hit = hits.at(-1); assert.equal(hit.apiKey, 'fixture-browser-api-12345');
        assert.equal(JSON.parse(hit.body).password, 'fixture-browser-password-56789');
        await page.locator('#stepsList li').first().click();
        const visible = await page.locator('#stepsList').textContent() + await page.locator('#reportPanel').textContent();
        assert.doesNotMatch(visible, /fixture-browser-api-12345|fixture-browser-password-56789/);
        assert.match(visible, /visible-control/);
        await page.screenshot({ path: path.join(artifacts, 'sensitive-diagnostic.png'), fullPage: true });
        await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.copied = text; } } }));
        await page.locator('#copyDiagnosisJsonBtn').click();
        await page.waitForFunction(() => Boolean(window.copied));
        assert.doesNotMatch(await page.evaluate(() => window.copied), /fixture-browser-api-12345|fixture-browser-password-56789/);
        await page.locator('#resetBtn').click(); await run('#stepBtn');
        await page.locator('#stepsList li').first().click();
        assert.doesNotMatch(await page.locator('#stepsList').textContent(), /fixture-browser-api-12345|fixture-browser-password-56789/);
    });
    await check('临时请求特殊字符：服务接收原值，响应展示隐藏', async () => {
        await select('special');
        await page.locator('[data-adhoc-step="0"]').click();
        await page.locator('#adhocHeadersInput').fill('{}');
        await page.locator('#adhocBodyInput').fill(JSON.stringify({ password: special, label: 'visible-control' }));
        await page.locator('#adhocExecuteBtn').click();
        await page.waitForFunction(() => !document.querySelector('#adhocResult').classList.contains('hidden'));
        assert.equal(JSON.parse(hits.at(-1).body).password, special);
        const result = await page.locator('#adhocResult').textContent();
        noSecret(result, special, '临时请求响应'); assert.match(result, /visible-control/);
        await page.screenshot({ path: path.join(artifacts, 'adhoc-special.png'), fullPage: true });
        await page.locator('#adhocCloseBtn').click();
    });
    await check('特殊字符敏感回显：工作台诊断和报告', async () => {
        await select('special'); await run();
        assert.equal(JSON.parse(hits.at(-1).body).password, special);
        await page.locator('#stepsList li').first().click();
        const visible = await page.locator('#stepsList').textContent() + await page.locator('#reportPanel').textContent();
        noSecret(visible, special, '工作台诊断'); assert.match(visible, /visible-control/);
        await page.evaluate(() => { window.copied = ''; });
        await page.locator('#copyDiagnosisJsonBtn').click(); await page.waitForFunction(() => !!window.copied);
        const report = await page.evaluate(() => window.copied); noSecret(report, special, '工作台 JSON');
        await page.screenshot({ path: path.join(artifacts, 'special-diagnostic.png'), fullPage: true });
    });
    await check('目录折叠与场景置顶', async () => {
        const toggle = page.locator('[data-scenario-dir-toggle="dir:cases"]');
        await toggle.click(); assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
        assert.equal(await page.locator('[data-scenario-file="cases/flow.js"]:visible').count(), 0);
        await toggle.click(); assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
        await page.locator('[data-pin-file="cases/flow.js"]').click();
        assert.equal(await page.locator('[data-scenario-dir-toggle="pinned"]').count(), 1);
        assert.equal(await page.locator('[data-pin-file="cases/flow.js"]').getAttribute('aria-label'), '取消置顶');
        await page.locator('[data-pin-file="cases/flow.js"]').click();
        assert.equal(await page.locator('[data-scenario-dir-toggle="pinned"]').count(), 0);
    });
    await check('边界：场景搜索无匹配不执行隐藏场景', async () => {
        const before = hits.length; await page.locator('#scenarioSearchInput').fill('不存在xyz');
        assert.equal(await page.locator('[data-scenario-file]:visible').count(), 0);
        assert.equal(hits.length, before); await page.locator('#scenarioSearchInput').fill('');
        assert.equal(await page.locator('[data-scenario-file]:visible').count(), Object.keys(scenarios).length);
    });
    await check('正例：报告JSON与失败跳过状态一致', async () => {
        await select('stop'); await run();
        await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.copied = text; } } }));
        await page.locator('#copyDiagnosisJsonBtn').click();
        await page.waitForFunction(() => Boolean(window.copied));
        const report = JSON.parse(await page.evaluate(() => window.copied));
        assert.equal(report.status, 'FAILED');
        assert.equal(report.summary.failedSteps, 1); assert.equal(report.summary.skippedSteps, 1); assert.equal(report.summary.passedSteps, 1);
        assert.equal(report.steps.length, 3);
        fs.writeFileSync(path.join(artifacts, 'exported-report.json'), JSON.stringify(report, null, 2));
    });
    await check('正例：临时请求实际执行及敏感头草稿遮蔽', async () => {
        await page.locator('[data-adhoc-step="0"]').click();
        await page.locator('#adhocHeadersInput').fill(JSON.stringify({ Authorization: 'Bearer fixture-secret', 'X-Test': 'local' }));
        const before = hits.length; await page.locator('#adhocExecuteBtn').click();
        await page.waitForFunction(() => !document.querySelector('#adhocDraftBtn').disabled);
        assert.equal(hits.length, before + 1);
        await page.locator('#adhocDraftBtn').click();
        const draft = await page.locator('#adhocDraftCode').textContent();
        assert.doesNotMatch(draft, /fixture-secret/); assert.match(draft, /vars.authorization/);
        assert.match(draft, /"status": 200/);
        await page.locator('#adhocDraftCode').screenshot({ path: path.join(artifacts, 'draft-masked.png') });
        await page.locator('#adhocCloseBtn').click();
    });
    await check('边界：空场景清单不会发请求', async () => {
        const before = hits.length; await page.goto(`${origin}/?empty`);
        await page.waitForSelector('#runBtn'); assert.equal(await page.locator('[data-scenario-file]').count(), 0);
        await page.locator('#runBtn').click(); assert.equal(hits.length, before);
        await page.screenshot({ path: path.join(artifacts, 'empty.png'), fullPage: true });
    });
    assert.deepEqual(errors, []);
    await check('无效配置拒绝初始化且不发请求', async () => {
        const before = hits.length; await page.goto(`${origin}/?invalid`);
        await page.waitForTimeout(100);
        assert.ok(errors.some(message => /envs/.test(message)), `缺少配置错误原因: ${errors.join(', ')}`);
        assert.equal(await page.locator('#runBtn').count(), 0); assert.equal(hits.length, before);
    });
} catch (error) { console.error(error); process.exitCode = 1; }
finally {
    await browser?.close();
    await Promise.all(servers.map(server => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); })));
    evidence.hits = hits;
    fs.writeFileSync(path.join(artifacts, 'result.json'), JSON.stringify(evidence, null, 2));
}

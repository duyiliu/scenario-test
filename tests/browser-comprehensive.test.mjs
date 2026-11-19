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
// YIL-199：模拟 serve 落盘后的场景文件（虚拟 /scenarios/*.js 路由供复制场景重新加载）
const virtualScenarios = {};
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
        // YIL-199 复制场景：serve 模式下前端落盘 + 注册后按 <script> 重新加载，
        // 这里以内存虚拟文件模拟（虚拟 scenarios/ 前缀与写接口白名单同口径）
        const virtualId = /^\/scenarios\/(.+)\.js$/.exec(url.pathname)?.[1];
        if (virtualId && virtualScenarios[virtualId]) { res.setHeader('Content-Type', 'text/javascript'); res.end(virtualScenarios[virtualId]); return; }
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
    // adhoc 弹窗在 rAF 里补默认聚焦，fill 前先等聚焦落定，避免 insertText 写进错误输入框
    const openAdhoc = async index => {
        await page.locator(`[data-adhoc-step="${index}"]`).click();
        await page.waitForFunction(() => document.activeElement && document.activeElement.id === 'adhocNameInput');
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
        const diffText = await page.locator('.structural-diff').first().textContent();
        assert.match(diffText, /expected/);
        assert.match(diffText, /actual/);
        // 字段级差异路径透出（与 --json 的 diff.entries 同口径）：name 值差异 + n 字段缺失
        assert.match(diffText, /items/);
        assert.match(diffText, /name/);
        // 期望/实际分色高亮（字段级高亮差异的渲染证据）
        assert.equal(await page.locator('.structural-diff .diff-expected').count() > 0, true);
        assert.equal(await page.locator('.structural-diff .diff-actual').count() > 0, true);
        // 失败诊断报告面板同样展开字段级 diff（不只在断言表）
        assert.match(await page.locator('#reportPanel').textContent(), /字段差异/);
        assert.match(await page.locator('#reportPanel .structural-diff').first().textContent(), /name/);
        // Markdown 诊断报告与 CLI/--json 同口径：字段差异行透出字段路径与期望/实得值
        await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.copied = text; } } }));
        await page.locator('#copyDiagnosisMarkdownBtn').click();
        await page.waitForFunction(() => Boolean(window.copied));
        const markdown = await page.evaluate(() => window.copied);
        assert.match(markdown, /期望: .*,实得: /);
        assert.match(markdown, /字段差异/);
        assert.match(markdown, /name.*expected.*actual|name.*期望.*实际/s);
        await page.screenshot({ path: path.join(artifacts, 'nested-length.png'), fullPage: true });
    });
    await check('反例：临时请求无效JSON不发请求', async () => {
        await openAdhoc(0);
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
        await openAdhoc(0);
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
        await openAdhoc(0);
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
    // ===== YIL-199 场景编辑：步骤排序 / 变量快编 / 场景复制 =====
    const names = () => page.evaluate(() => Array.from(document.querySelectorAll('#stepsList li')).map(li => {
        // 编辑模式每行有两个带 title 的 span：先是拖拽把手（无文本），其后才是步骤名
        const spans = Array.from(li.querySelectorAll('span[title]')).filter(s => s.textContent.trim());
        return spans.length ? spans[0].textContent.trim() : '';
    }).filter(Boolean));
    await check('YIL-199 编辑模式：↑↓ 与拖拽调整步骤顺序，执行序随编辑改变', async () => {
        await select('flow');
        assert.equal(await page.locator('#editScenarioBtn').isDisabled(), false);
        await page.locator('#editScenarioBtn').click();
        assert.equal(await page.locator('#editToolbar').isVisible(), true);
        assert.equal(await page.locator('#stepsList li[draggable="true"]').count(), 2);
        assert.deepEqual(await names(), ['提取', '使用变量']);
        // ↑↓ 按钮：第 2 步上移
        await page.locator('#stepsList li').nth(1).locator('[data-step-move="up"]').click();
        assert.deepEqual(await names(), ['使用变量', '提取']);
        assert.equal(await page.locator('#scenarioDirtyBadge').isVisible(), true);
        assert.equal(await page.locator('#saveScenarioBtn').isDisabled(), false);
        // HTML5 DnD 合成事件：DragEventInit.dataTransfer 只接受真 DataTransfer（Chrome 可构造），
        // 用 MouseEvent + defineProperty 注入 dataTransfer/clientY，走工作台同一套 drag/drop 监听
        const simulateDrag = (fromIdx, toIdx, before) => page.evaluate(([fromIdx, toIdx, before]) => {
            const rows = Array.from(document.querySelectorAll('#stepsList li[data-step-idx]'));
            const source = rows[fromIdx];
            const target = rows[toIdx];
            const transfer = new DataTransfer();
            const fire = (node, type, y) => node.dispatchEvent(new DragEvent(type, {
                bubbles: true, cancelable: true, dataTransfer: transfer,
                clientY: typeof y === 'number' ? y : 0
            }));
            fire(source.querySelector('.step-drag-handle'), 'dragstart');
            const rect = target.getBoundingClientRect();
            const y = before ? rect.top + 1 : rect.bottom - 1;
            fire(target, 'dragover', y);
            fire(target, 'drop', y);
            fire(source, 'dragend');
        }, [fromIdx, toIdx, before]);
        // 拖拽把手：把「使用变量」拖到「提取」之后恢复原序（drop 命中目标下半区 → insertIndex=target+1）
        await simulateDrag(0, 1, false);
        assert.deepEqual(await names(), ['提取', '使用变量']);
        // 执行序证明编辑真的改了 state.scenario：拖到 使用变量 在前后执行，/use/ 先于 /seed 到达
        await simulateDrag(1, 0, true);
        assert.deepEqual(await names(), ['使用变量', '提取']);
        const before = hits.length;
        await run();
        const newHits = hits.slice(before).map(h => h.path);
        assert.equal(newHits.filter(p => p.startsWith('/use/')).length, 1);
        assert.ok(newHits.indexOf('/seed') > newHits.findIndex(p => p.startsWith('/use/')), '编辑后的步骤顺序应影响执行顺序');
        // 有执行结果时禁入编辑；清除结果（保留未保存改动仍可放弃）
        assert.equal(await page.locator('#editScenarioBtn').isDisabled(), true);
        await page.locator('#resetBtn').click();
        page.once('dialog', dialog => dialog.accept());
        await page.locator('#discardScenarioEditsBtn').click();
        // 放弃改动经 <script> 重载：脏徽标消失 = loadScenario onload 走完（等待行数会读到旧渲染）
        await page.waitForFunction(() => document.getElementById('scenarioDirtyBadge').style.display === 'none'
            && document.querySelectorAll('#stepsList li').length === 2);
        assert.deepEqual(await names(), ['提取', '使用变量']);
        assert.equal(await page.locator('#scenarioDirtyBadge').isVisible(), false);
    });
    await check('YIL-199 变量快编 + 保存降级剪贴板：vars/envVars 改写并入源码', async () => {
        await select('editvars');
        await page.locator('#editScenarioBtn').click();
        await page.locator('#editScenarioVarsBtn').click();
        assert.equal(await page.locator('#varsModal').isVisible(), true);
        // 既有行渲染：vars 3 行、envVars 空；新增一行 envVars 映射（加载期凭据校验不适用编辑路径）
        assert.equal(await page.locator('#varsEditorRows .vars-editor-row').count(), 3);
        assert.equal(await page.locator('#envVarsEditorRows .vars-editor-row').count(), 0);
        await page.locator('#envVarsAddRowBtn').click();
        await page.locator('#envVarsEditorRows .vars-editor-row').nth(0).locator('.vars-editor-key').fill('apiToken');
        await page.locator('#envVarsEditorRows .vars-editor-row').nth(0).locator('.vars-editor-value').fill('联调 Token');
        // 改值：tenant → "renamed"，labels → {"a":"乙","b":2}
        const varsRows = page.locator('#varsEditorRows .vars-editor-row');
        await varsRows.nth(0).locator('.vars-editor-value').fill('"renamed"');
        await varsRows.nth(2).locator('.vars-editor-value').fill('{"a":"乙","b":2}');
        // 新增一行 token
        await page.locator('#varsAddRowBtn').click();
        const newRow = varsRows.nth(3);
        await newRow.locator('.vars-editor-key').fill('token');
        await newRow.locator('.vars-editor-value').fill('"t-9"');
        await page.locator('#varsApplyBtn').click();
        await page.waitForFunction(() => document.querySelector('#varsModal').classList.contains('hidden'));
        assert.equal(await page.locator('#scenarioDirtyBadge').isVisible(), true);
        // envVars 注入后场景凭据输入面板出现 apiToken 输入框
        assert.equal(await page.locator('#scenarioVar_apiToken').count(), 1);
        // 重复变量名被拒：再把 limit 改名为 tenant → 错误提示、弹窗不关
        await page.locator('#editScenarioVarsBtn').click();
        await page.locator('#varsEditorRows .vars-editor-row').nth(1).locator('.vars-editor-key').fill('tenant');
        await page.locator('#varsApplyBtn').click();
        assert.match(await page.locator('#varsModalError').textContent(), /变量名重复/);
        assert.equal(await page.locator('#varsModal').isVisible(), true);
        await page.locator('#varsCancelBtn').click();
        // 保存：非 serve 降级剪贴板，源码含改写后的变量且顺序不变
        await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.copied = text; } } }));
        await page.locator('#saveScenarioBtn').click();
        await page.waitForFunction(() => Boolean(window.copied));
        const saved = await page.evaluate(() => window.copied);
        assert.match(saved, /registerScenario\("editvars"/);
        assert.match(saved, /tenant: "renamed"/);
        assert.match(saved, /token: "t-9"/);
        assert.match(saved, /a: "乙",\s*b: 2/);
        assert.match(saved, /envVars/);
        assert.match(saved, /apiToken: "联调 Token"/);
        assert.equal(await page.locator('#scenarioDirtyBadge').isVisible(), false);
    });
    await check('YIL-199 场景复制：剪贴板降级含全量源码，serve 模式写盘+注册+选中', async () => {
        // 上个用例的变量改动已复制到剪贴板（内存定义已变）；先切走再切回，拿到干净的夹具定义
        await select('flow');
        await select('editvars');
        // 非 serve：复制新场景源码到剪贴板
        await page.evaluate(() => { window.copied = ''; });
        await page.locator('[data-dup-file="cases/editvars.js"]').click();
        assert.equal(await page.locator('#duplicateModal').isVisible(), true);
        await page.locator('#duplicateIdInput').fill('editvars-copy');
        await page.locator('#duplicateNameInput').fill('夹具副本');
        await page.locator('#duplicateFileInput').fill('scenarios/editvars-copy.js');
        await page.locator('#duplicateConfirmBtn').click();
        // 校验失败会落在 #duplicateError 而不是剪贴板：两者任一出现才往下走，超时带原因
        await page.waitForFunction(() => Boolean(window.copied)
            || !document.getElementById('duplicateError').classList.contains('hidden'), undefined, { timeout: 10000 });
        const dupError = await page.locator('#duplicateError').textContent();
        assert.equal(dupError.trim(), '', `复制校验应通过: ${dupError}`);
        assert.ok(await page.evaluate(() => Boolean(window.copied)), '降级模式应已写入剪贴板');
        const copiedSource = await page.evaluate(() => window.copied);
        assert.match(copiedSource, /registerScenario\("editvars-copy"/);
        assert.match(copiedSource, /name: "夹具副本"/);
        assert.match(copiedSource, /tenant: "fixture"/);
        assert.match(copiedSource, /第三步 ok/);
        await page.waitForFunction(() => document.querySelector('#duplicateModal').classList.contains('hidden'));
        assert.equal(await page.locator('[data-scenario-file="scenarios/editvars-copy.js"]').count(), 0, '降级模式不应自动注册清单');
        // 模拟 serve：置代理标记 + stub 两个写接口 + 内存虚拟场景文件
        await page.evaluate(() => {
            window.__SCENARIO_TEST_SERVE_PROXY__ = true;
            window.__editStub = { posts: [] };
            const original = window.fetch;
            window.fetch = (url, opts) => {
                if (typeof url === 'string' && url.startsWith('/__scenario-test__/') && opts && opts.method === 'POST') {
                    const body = JSON.parse(opts.body || '{}');
                    window.__editStub.posts.push({ url, body });
                    if (url.endsWith('/scenario-file')) {
                        const match = /^scenarios\/(.+)\.js$/.exec(body.file || '');
                        if (match) window.__editStub.files = Object.assign(window.__editStub.files || {}, { [match[1]]: body.content });
                    }
                    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, file: body.file, id: body.id }) });
                }
                return original(url, opts);
            };
        });
        // 前端确认后会立即按 <script> 拉新场景文件：先把虚拟文件挂到 /scenarios/ 路由
        virtualScenarios['editvars-copy2'] = `ScenarioTest.registerScenario("editvars-copy2", ScenarioTest.defineScenario({name: "夹具副本2", steps: [{ name: "第一步 seed", path: "seed" }, { name: "第二步 echo", method: "POST", path: "echo", request: { body: {} } }, { name: "第三步 ok", path: "ok" }]}));`;
        await page.locator('[data-dup-file="cases/editvars.js"]').click();
        await page.locator('#duplicateNameInput').fill('夹具副本2');
        await page.locator('#duplicateIdInput').fill('editvars-copy2');
        await page.locator('#duplicateFileInput').fill('scenarios/editvars-copy2.js');
        await page.locator('#duplicateConfirmBtn').click();
        await page.waitForFunction(() => document.querySelector('#duplicateModal').classList.contains('hidden'));
        const posts = await page.evaluate(() => window.__editStub.posts);
        assert.equal(posts.length, 2);
        assert.equal(posts[0].url, '/__scenario-test__/scenario-file');
        assert.equal(posts[0].body.create, true);
        assert.equal(posts[0].body.file, 'scenarios/editvars-copy2.js');
        assert.match(posts[0].body.content, /registerScenario\("editvars-copy2"/);
        assert.equal(posts[1].url, '/__scenario-test__/config-scenarios');
        assert.deepEqual(posts[1].body, { id: 'editvars-copy2', name: '夹具副本2', file: 'scenarios/editvars-copy2.js' });
        // 前端已自动加载新场景（虚拟路由供出的注册源码）
        await page.waitForFunction(() => document.querySelector('#scenarioTitle').textContent.includes('夹具副本2'));
        assert.equal(await page.locator('[data-scenario-file="scenarios/editvars-copy2.js"]').count(), 1);
        assert.deepEqual(await names(), ['第一步 seed', '第二步 echo', '第三步 ok']);
        // serve 模式保存当前（未改动 → 保存按钮禁用）
        assert.equal(await page.locator('#saveScenarioBtn').isDisabled(), true);
        await page.evaluate(() => { delete window.__SCENARIO_TEST_SERVE_PROXY__; });
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

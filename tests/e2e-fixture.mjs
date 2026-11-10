import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { createE2eExtension } from '../src/e2e/extension.js';

const deps = process.env.SCENARIO_TEST_E2E_NODE_MODULES || path.resolve('examples/e2e/e2e/node_modules');
const cli = path.resolve('dist/scenario-test-cli.cjs');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

test('干净项目真实浏览器：两条场景隔离、登录步骤、截图、失败与停止', { timeout: 120000, skip: !fs.existsSync(path.join(deps, '@playwright/test/cli.js')) }, async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scenario-e2e-browser-'));
  const init = spawnSync(process.execPath, [cli, 'init', '--project', root, '--e2e', '--no-input'], { encoding: 'utf8' });
  assert.equal(init.status, 0, init.stderr);
  const workspace = path.join(root, 'scenario-test');
  const e2e = path.join(workspace, 'e2e');
  fs.symlinkSync(deps, path.join(e2e, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  const tests = path.join(e2e, 'tests');
  fs.writeFileSync(path.join(e2e, 'auth-adapter.js'), `export async function login({context,account}) { await context.addCookies([{name:'fixture_user',value:account,url:process.env.E2E_BASE_URL}]); }`);
  const source = (name, account, fails) => `import { test, expect } from '@playwright/test';\nimport { login } from '../auth-adapter.js';\ntest('${name}', async ({page,context},info)=>{await test.step('场景登录',()=>login({context,account:'${account}'}));await page.goto('/');await expect(page.locator('h1')).toHaveText('账号 ${account}');await info.attach('${name}',{body:await page.screenshot(),contentType:'image/png'});${fails ? "expect(1).toBe(2);" : "await expect(page).toHaveTitle('Fixture');"}});\n`;
  fs.writeFileSync(path.join(tests, 'a.spec.js'), source('成功 A', 'A', false));
  fs.writeFileSync(path.join(tests, 'b.spec.js'), source('失败 B', 'B', true));
  fs.writeFileSync(path.join(tests, 'slow.spec.js'), "import {test} from '@playwright/test'; test('等待',async()=>{await new Promise(r=>setTimeout(r,30000))});");
  const ext = createE2eExtension({ workspace });
  const server = http.createServer(async (req,res) => {
    if (req.url === '/fixture') { res.writeHead(200, {'Content-Type':'text/html'}); res.end('<title>Fixture</title><h1>账号 '+(/fixture_user=([^;]+)/.exec(req.headers.cookie || '')?.[1] || '无')+'</h1>'); return; }
    if (!(await ext.handle(req,res,new URL(req.url,'http://localhost').pathname))) { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  // 示例场景导航根路径：本地 fixture 仅在此测试服务器内。
  server.removeAllListeners('request');
  server.on('request', async (req,res) => {
    if (req.url === '/') { res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'}); res.end('<title>Fixture</title><h1>账号 '+(/fixture_user=([^;]+)/.exec(req.headers.cookie || '')?.[1] || '无')+'</h1>'); return; }
    if (!(await ext.handle(req,res,new URL(req.url,'http://localhost').pathname))) { res.writeHead(404); res.end(); }
  });
  process.env.E2E_BASE_URL = base; process.env.E2E_BROWSER_CHANNEL = 'chrome';
  t.after(async()=>{ await ext.dispose(); server.closeAllConnections(); await new Promise(resolve=>server.close(resolve)); delete process.env.E2E_BASE_URL; delete process.env.E2E_BROWSER_CHANNEL; });
  const browser = await chromium.launch({channel:'chrome',headless:true});
  t.after(()=>browser.close());
  console.log(`浏览器 ${browser.version()}，Playwright 依赖 ${deps}，产物目录 ${root}`);
  const page = await browser.newPage(); await page.goto(base+'/e2e/');
  const post = (route,body) => fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const result = async spec => (await (await fetch(base+'/e2e/api/result?spec='+encodeURIComponent(spec))).json());
  async function run(spec) {
    await page.getByRole('button',{name:spec,exact:true}).click();
    const pending = page.waitForResponse(response => response.url().endsWith('/e2e/api/run') && response.request().method() === 'POST');
    await page.getByRole('button',{name:'运行',exact:true}).click();
    const response = await pending; assert.equal(response.status(),202);
    const {runId} = await response.json();
    for (let i=0;i<200;i++){const state=await(await fetch(base+'/e2e/api/state')).json();if(!state.running)break;await wait(100)}
    const out=await result(spec); assert.equal(out?.runId,runId); return out;
  }
  const a = await run('tests/a.spec.js');
  assert.equal(a.results['tests/a.spec.js'][0].status,'passed');
  assert.ok(a.steps['tests/a.spec.js'].some(step=>step.title==='场景登录'));
  assert.equal(a.screenshots.length,1); assert.equal(a.reportAvailable,true);
  const b = await run('tests/b.spec.js');
  assert.equal(b.results['tests/b.spec.js'][0].status,'failed');
  assert.ok(b.screenshots.length>=1); assert.equal((await result('tests/a.spec.js')).runId,a.runId);
  const report=await fetch(base+`/e2e/api/artifacts/${a.runId}/report/index.html`); assert.equal(report.status,200);
  const image=await fetch(base+`/e2e/api/artifacts/${a.runId}/${a.screenshots[0].file}`); assert.equal(image.status,200);
  const started=await post('/e2e/api/run',{spec:'tests/slow.spec.js'});const slow=await started.json();await wait(800);
  assert.equal((await post('/e2e/api/stop',{})).status,202);
  for(let i=0;i<100;i++){if(!(await(await fetch(base+'/e2e/api/state')).json()).running)break;await wait(100)}
  assert.equal((await result('tests/slow.spec.js')).runId,slow.runId);
  await page.getByRole('button',{name:'tests/a.spec.js'}).click();
  await page.getByRole('link',{name:'查看报告'}).waitFor({timeout:10000});
  assert.equal(await page.locator('#shots img').count(),1);
  await page.getByRole('button',{name:'运行',exact:true}).waitFor({state:'visible'});
  for (let i=0; i<100 && !(await page.getByRole('button',{name:'运行',exact:true}).isEnabled()); i++) await wait(100);
  assert.equal(await page.getByRole('button',{name:'运行',exact:true}).isEnabled(), true);
  assert.equal(await page.locator('#steps .step-row').count(), 1);
  await page.getByRole('textbox',{name:'搜索测试文件'}).fill('b.spec');
  assert.equal(await page.locator('#list button').count(),1);
  await page.getByRole('textbox',{name:'搜索测试文件'}).fill('');
  assert.equal(await page.locator('#list button').count(),4);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.equal(await page.locator('.log-details').evaluate(el=>el.open),false);
  assert.equal(await page.evaluate(()=>document.querySelector('.log-details').getBoundingClientRect().top>=document.querySelector('.evidence').getBoundingClientRect().bottom-1),true);
  await page.screenshot({path:path.join(root,'workbench.png')});
  console.log('控制台截图：'+path.join(root,'workbench.png'));
});

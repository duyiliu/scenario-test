import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const skill = fileURLToPath(new URL('../skills/scenario-test/', import.meta.url));
const check = path.join(skill, 'scripts/check-runtime.mjs');
const ensure = path.join(skill, 'scripts/ensure-runtime.mjs');

// 必须用异步 spawn：本地发布源跑在本进程内，spawnSync 会阻塞事件循环，
// HTTP 服务无法回应子进程请求 → 互相等待到超时（实测卡死 300s）。
function run(args, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });
}

// v24 起 Skill 只装文本、不内嵌运行时：运行时按 SKILL.md 的 metadata.version
// 落到用户级 ~/.scenario-test/runtime/<版本>/，由 ensure-runtime.mjs 安装。
// 本节用本地静态源验证安装/校验/幂等，绝不访问真实 GitHub Release。
test('Skill 按需安装运行时：本地源安装 → 校验 → 幂等 → 篡改可检出', async () => {
  const { startStaticSource } = await import('./e2e/helpers/static-source.mjs');
  const source = await startStaticSource();
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'scenario-skill-runtime-'));
  const project = path.join(home, 'project');
  fs.mkdirSync(project);
  const env = { HOME: home, USERPROFILE: home };
  const runWithHome = (...args) => run(args, env);
  try {
    // 未装时应报 missing，且 check-runtime 明确指向 ensure-runtime
    const detectBefore = JSON.parse((await runWithHome(path.join(skill, 'scripts/detect-project.mjs'), '--project', project)).stdout);
    assert.equal(detectBefore.status, 'not-initialized');
    assert.equal(detectBefore.runtime.status, 'missing');
    assert.match((await runWithHome(check)).stderr, /运行时未安装|ensure-runtime/);

    // 首次安装：从本地发布源拉整包
    const installed = await runWithHome(ensure, '--source', source.baseUrl);
    assert.equal(installed.status, 0, installed.stderr + installed.stdout);
    const runtimeDir = path.join(home, '.scenario-test', 'runtime', source.version);
    assert.ok(fs.existsSync(path.join(runtimeDir, 'scenario-test-cli.cjs')));
    assert.ok(fs.existsSync(path.join(runtimeDir, 'release.json')));

    // 再装一次：应当直接命中，不重复下载（输出里不再出现"下载"）
    const again = await runWithHome(ensure, '--source', source.baseUrl);
    assert.equal(again.status, 0, again.stderr);
    assert.doesNotMatch(again.stderr, /下载 scenario-test 运行时/);

    // 校验通过 → init 只落场景数据
    const cli = path.join(runtimeDir, 'scenario-test-cli.cjs');
    assert.equal((await runWithHome(check)).status, 0);
    const init = await runWithHome(cli, 'init', '--project', project, '--dir', 'scenario-test', '--no-input');
    assert.equal(init.status, 0, init.stderr + init.stdout);
    assert.equal(fs.existsSync(path.join(project, 'scenario-test', '.scenario-test')), false);
    assert.deepEqual(fs.readdirSync(path.join(project, 'scenario-test')).sort(), ['README.md', 'scenario.config.js', 'start-scenario-test.cmd']);

    // 篡改已装文件后 check-runtime 必须报校验失败
    fs.appendFileSync(path.join(runtimeDir, 'scenario-test.d.ts'), '\n// altered');
    assert.match((await runWithHome(check)).stderr, /文件校验失败/);
  } finally {
    await source.close();
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('Skill 不再内嵌运行时：目录里只有文本与脚本', () => {
  assert.equal(fs.existsSync(path.join(skill, 'runtime')), false, 'Skill 目录不得包含 runtime/ 副本');
  const entries = fs.readdirSync(skill).sort();
  assert.deepEqual(entries, ['SKILL.md', 'references', 'scripts']);
});

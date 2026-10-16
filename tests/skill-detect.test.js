import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const detector = fileURLToPath(new URL('../skills/scenario-test/scripts/detect-project.mjs', import.meta.url));
const required = [
  'scenario.config.js', 'index.html',
  '.scenario-test/AI_SCENARIO_PROMPT.md', '.scenario-test/SCENARIO_PATTERNS.md',
  '.scenario-test/scenario-test-cli.cjs', '.scenario-test/scenario-test.umd.js',
  '.scenario-test/scenario-test.d.ts', '.scenario-test/scenario-test-capabilities.json',
  '.scenario-test/.scenario-test-version.json',
];

function run(cwd, ...args) {
  return spawnSync(process.execPath, [detector, '--cwd', cwd, ...args], { encoding: 'utf8' });
}
function fixture(callback) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scenario-skill-detect-'));
  try { callback(root); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
function createInstall(root, dir = 'scenario-test') {
  const base = path.join(root, dir);
  for (const file of required) {
    const name = path.join(base, file);
    fs.mkdirSync(path.dirname(name), { recursive: true });
    fs.writeFileSync(name, '', 'utf8');
  }
  return base;
}

test('未接入：识别工作树 .git 文件标记，不扫描其它目录', () => fixture((root) => {
  fs.writeFileSync(path.join(root, '.git'), 'gitdir: /tmp/worktrees/test\n');
  const nested = path.join(root, 'src', 'service');
  fs.mkdirSync(nested, { recursive: true });
  const result = run(nested);
  assert.equal(result.status, 0, result.stderr);
  const data = JSON.parse(result.stdout);
  assert.equal(data.status, 'not-initialized');
  assert.equal(data.projectRoot, root);
  assert.equal(data.detectedBy, 'project-marker');
}));

test('已接入：从嵌套目录发现项目，给出本地规则路径', () => fixture((root) => {
  createInstall(root);
  const nested = path.join(root, 'src', 'controllers');
  fs.mkdirSync(nested, { recursive: true });
  const result = run(nested);
  const data = JSON.parse(result.stdout);
  assert.equal(result.status, 0);
  assert.equal(data.status, 'installed');
  assert.equal(data.projectRoot, root);
  assert.equal(data.authoringPrompt, path.join(root, 'scenario-test/.scenario-test/AI_SCENARIO_PROMPT.md'));
  assert.equal(data.missing.length, 0);
  assert.match(data.note, /doctor/);
}));

test('不完整：列出缺失文件，不误判安装完成', () => fixture((root) => {
  const dir = createInstall(root);
  fs.rmSync(path.join(dir, '.scenario-test/scenario-test-capabilities.json'));
  const data = JSON.parse(run(root).stdout);
  assert.equal(data.status, 'incomplete');
  assert.deepEqual(data.missing, ['.scenario-test/scenario-test-capabilities.json']);
}));

test('子项目优先：子项目未初始化时不误用父项目运行时', () => fixture((root) => {
  createInstall(root);
  const child = path.join(root, 'packages', 'service-a');
  fs.mkdirSync(child, { recursive: true });
  fs.writeFileSync(path.join(child, 'package.json'), '{}');
  const data = JSON.parse(run(child).stdout);
  assert.equal(data.status, 'not-initialized');
  assert.equal(data.projectRoot, child);
}));

test('自定义目录与显式项目根目录', () => fixture((root) => {
  createInstall(root, 'dev/场景测试');
  const nested = path.join(root, 'src');
  fs.mkdirSync(nested);
  const result = run(nested, '--dir', 'dev/场景测试');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).status, 'installed');
  const direct = spawnSync(process.execPath, [detector, '--project', root, '--dir', 'dev/场景测试'], { encoding: 'utf8' });
  assert.equal(JSON.parse(direct.stdout).detectedBy, 'explicit-project');
}));

test('拒绝越界目标目录与未知参数', () => fixture((root) => {
  assert.equal(run(root, '--dir', '../outside').status, 2);
  assert.equal(run(root, '--dir', '/tmp/outside').status, 2);
  assert.equal(run(root, '--force').status, 2);
}));

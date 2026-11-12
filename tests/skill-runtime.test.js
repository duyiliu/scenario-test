import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const skill = fileURLToPath(new URL('../skills/scenario-test/', import.meta.url));
const cli = path.join(skill, 'runtime/scenario-test-cli.cjs');
const check = path.join(skill, 'scripts/check-runtime.mjs');
const run = (...args) => spawnSync(process.execPath, args, { encoding: 'utf8' });

// v23 起项目不再落运行时副本：init 产物只有场景数据，执行统一使用 Skill 的 runtime CLI。
// Skill 运行时完整性由 check-runtime.mjs 按 release.json 的 sha256 校验（含 AI 规则文件）。
test('Skill 发布版离线初始化：项目只落场景数据，cli 统一指向 Skill 运行时', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scenario-skill-runtime-'));
  try {
    const project = path.join(root, 'project');
    fs.mkdirSync(project);
    const valid = run(check);
    assert.equal(valid.status, 0, valid.stderr);
    const init = run(cli, 'init', '--project', project, '--dir', 'scenario-test', '--no-input');
    assert.equal(init.status, 0, init.stderr + init.stdout);
    // init 不得在项目内落任何运行时副本
    assert.equal(fs.existsSync(path.join(project, 'scenario-test', '.scenario-test')), false, '项目内不得出现 .scenario-test 副本');
    assert.equal(fs.existsSync(path.join(project, 'scenario-test', 'index.html')), false, '项目内不得出现 index.html');
    assert.deepEqual(fs.readdirSync(path.join(project, 'scenario-test')).sort(), ['README.md', 'scenario.config.js', 'start-scenario-test.cmd']);

    // 复制一份 Skill 并篡改 release.json 的版本号：探测结果只认 Skill 运行时路径，
    // 与版本号无关（项目无锁文件可比对）
    const copiedSkill = path.join(root, 'skill');
    fs.cpSync(skill, copiedSkill, { recursive: true });
    const manifest = path.join(copiedSkill, 'runtime/release.json');
    const release = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    release.version = '99.0.0';
    fs.writeFileSync(manifest, JSON.stringify(release));
    const detect = run(path.join(copiedSkill, 'scripts/detect-project.mjs'), '--project', project);
    assert.equal(detect.status, 0, detect.stderr);
    const found = JSON.parse(detect.stdout);
    assert.equal(found.status, 'installed');
    assert.equal(found.cli, path.join(copiedSkill, 'runtime/scenario-test-cli.cjs'));
    assert.equal(found.skillCli, found.cli);
    const doctor = run(found.cli, 'doctor', '--config', found.config);
    assert.equal(doctor.status, 0, doctor.stderr + doctor.stdout);
    const corrupted = path.join(copiedSkill, 'runtime/scenario-test.d.ts');
    fs.appendFileSync(corrupted, '\n// altered');
    assert.match(run(path.join(copiedSkill, 'scripts/check-runtime.mjs')).stderr, /文件校验失败/);
    // AI 规则文件同样受 release.json sha256 校验
    const corruptedRule = path.join(copiedSkill, 'runtime/AI_SCENARIO_PROMPT.md');
    fs.appendFileSync(corruptedRule, '\n// altered');
    assert.match(run(path.join(copiedSkill, 'scripts/check-runtime.mjs')).stderr, /文件校验失败/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

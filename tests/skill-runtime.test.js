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

test('Skill 发布版离线初始化，项目与 Skill 版本不同时仍使用项目 CLI', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scenario-skill-runtime-'));
  try {
    const project = path.join(root, 'project');
    fs.mkdirSync(project);
    const valid = run(check);
    assert.equal(valid.status, 0, valid.stderr);
    const init = run(cli, 'init', '--project', project, '--dir', 'scenario-test', '--no-input');
    assert.equal(init.status, 0, init.stderr + init.stdout);
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
    assert.equal(found.cli, path.join(project, 'scenario-test/.scenario-test/scenario-test-cli.cjs'));
    assert.equal(found.skillCli, path.join(copiedSkill, 'runtime/scenario-test-cli.cjs'));
    const doctor = run(found.cli, 'doctor', '--config', found.config);
    assert.equal(doctor.status, 0, doctor.stderr + doctor.stdout);
    const corrupted = path.join(copiedSkill, 'runtime/scenario-test.d.ts');
    fs.appendFileSync(corrupted, '\n// altered');
    assert.match(run(path.join(copiedSkill, 'scripts/check-runtime.mjs')).stderr, /文件校验失败/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

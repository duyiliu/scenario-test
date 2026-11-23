#!/usr/bin/env node
// 初始化前校验用户级运行时；运行时由 ensure-runtime.mjs 按 SKILL.md 版本安装，
// Skill 本身不再内嵌副本。已有项目由自己的 doctor 检查。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const skill = fileURLToPath(new URL('../', import.meta.url));
const names = ['scenario-test-cli.cjs', 'scenario-test.umd.js', 'scenario-test.d.ts', 'scenario-test-capabilities.json', 'AI_SCENARIO_PROMPT.md', 'SCENARIO_PATTERNS.md'];
try {
  if (process.argv.length !== 2) throw new Error('用法：node check-runtime.mjs');
  const skillMd = fs.readFileSync(path.join(skill, 'SKILL.md'), 'utf8');
  const versionMatch = /^\s*version:\s*"?([0-9][^"\n]*)"?\s*$/m.exec(skillMd);
  if (!versionMatch) throw new Error('SKILL.md 缺少 metadata.version');
  const version = versionMatch[1].trim();
  const runtime = path.join(os.homedir(), '.scenario-test', 'runtime', version);
  if (!fs.existsSync(path.join(runtime, 'release.json'))) {
    throw new Error(`运行时未安装：${runtime}。先运行 node ${path.join(skill, 'scripts/ensure-runtime.mjs')}`);
  }
  const release = JSON.parse(fs.readFileSync(path.join(runtime, 'release.json'), 'utf8'));
  if (release.version !== version) throw new Error(`运行时版本 ${release.version} 与 Skill ${version} 不一致`);
  for (const name of names) {
    const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(runtime, name))).digest('hex');
    if (!release.sha256?.[name] || actual !== release.sha256[name]) throw new Error(`文件校验失败：${name}`);
  }
  console.log(`运行时校验通过：${release.package}@${release.version}（${runtime}）`);
} catch (error) {
  console.error(`运行时检查失败：${error.message}`);
  process.exitCode = 1;
}

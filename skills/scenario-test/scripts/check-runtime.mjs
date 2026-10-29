#!/usr/bin/env node
// 初始化前校验 Skill 自带发布版；已有项目由自己的 doctor 检查。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const runtime = fileURLToPath(new URL('../runtime/', import.meta.url));
const names = ['scenario-test-cli.cjs', 'scenario-test.umd.js', 'scenario-test.d.ts', 'scenario-test-capabilities.json'];
try {
  if (process.argv.length !== 2) throw new Error('用法：node check-runtime.mjs');
  const release = JSON.parse(fs.readFileSync(path.join(runtime, 'release.json'), 'utf8'));
  for (const name of names) {
    const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(runtime, name))).digest('hex');
    if (!release.sha256?.[name] || actual !== release.sha256[name]) throw new Error(`文件校验失败：${name}`);
  }
  console.log(`Skill 运行时校验通过：${release.package}@${release.version}`);
} catch (error) {
  console.error(`Skill 运行时检查失败：${error.message}。请检查 Skill 安装。`);
  process.exitCode = 1;
}

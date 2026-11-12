#!/usr/bin/env node
// 只读取当前工作目录及其父目录；不扫描其它项目、不访问网络、不修改文件。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_MARKERS = ['.git', 'pom.xml', 'settings.gradle', 'settings.gradle.kts', 'build.gradle', 'build.gradle.kts', 'package.json', 'go.mod', 'Cargo.toml', 'pyproject.toml'];
// v23 起运行时去项目化：项目只保留场景数据，执行/工作台统一用 Skill 运行时。
// 旧版 init 落盘的 .scenario-test 运行时副本按 legacy 报告，由 Skill 提示 --clean 清理。
const REQUIRED_FILES = ['scenario.config.js'];
const LEGACY_FILES = [
  '.scenario-test/scenario-test-cli.cjs',
  '.scenario-test/scenario-test.umd.js',
  '.scenario-test/scenario-test-capabilities.json',
  '.scenario-test/.scenario-test-version.json',
  'index.html',
];

function exists(file) {
  try { fs.statSync(file); return true; } catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') return false;
    throw error;
  }
}

function parseArgs(args) {
  let cwd = process.cwd();
  let directory = 'scenario-test';
  let explicitProject = false;
  for (let i = 0; i < args.length; i += 1) {
    const key = args[i];
    if (key !== '--cwd' && key !== '--project' && key !== '--dir') {
      throw new Error(`未知参数：${key}（仅支持 --cwd、--project、--dir）`);
    }
    if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`${key} 缺少值`);
    const value = args[++i];
    if (key === '--dir') directory = value;
    else {
      cwd = path.resolve(value);
      if (key === '--project') explicitProject = true;
    }
  }
  const normalizedDir = directory.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '');
  const segments = normalizedDir.split('/');
  if (!normalizedDir || path.isAbsolute(directory) || segments.some((segment) => !segment || segment === '..' || segment === '.')) {
    throw new Error('--dir 必须是项目内部的相对路径');
  }
  if (!fs.statSync(cwd).isDirectory()) throw new Error(`目录不是文件夹：${cwd}`);
  return { cwd, directory: segments.join(path.sep), explicitProject };
}

function findProject(start, directory, explicitProject) {
  if (explicitProject) return { root: start, detectedBy: 'explicit-project' };
  let current = start;
  while (true) {
    const target = path.join(current, directory);
    if (exists(target)) return { root: current, detectedBy: 'scenario-test' };
    if (ROOT_MARKERS.some((marker) => exists(path.join(current, marker)))) {
      return { root: current, detectedBy: 'project-marker' };
    }
    const parent = path.dirname(current);
    if (parent === current) return { root: start, detectedBy: 'cwd' };
    current = parent;
  }
}

function inspect({ cwd, directory, explicitProject }) {
  const { root, detectedBy } = findProject(cwd, directory, explicitProject);
  const target = path.join(root, directory);
  let status = 'not-initialized';
  let missing = [];
  if (exists(target)) {
    missing = REQUIRED_FILES.filter((relative) => !exists(path.join(target, relative)));
    status = fs.statSync(target).isDirectory() && missing.length === 0 ? 'installed' : 'incomplete';
  }
  return {
    status, projectRoot: root, scenarioDir: target,
    config: path.join(target, 'scenario.config.js'),
    // 项目不再保留运行时副本：cli 统一指向 Skill 运行时
    cli: fileURLToPath(new URL('../runtime/scenario-test-cli.cjs', import.meta.url)),
    skillCli: fileURLToPath(new URL('../runtime/scenario-test-cli.cjs', import.meta.url)),
    skillRuntime: fileURLToPath(new URL('../runtime/', import.meta.url)),
    authoringPrompt: fileURLToPath(new URL('../runtime/AI_SCENARIO_PROMPT.md', import.meta.url)),
    patterns: fileURLToPath(new URL('../runtime/SCENARIO_PATTERNS.md', import.meta.url)),
    capabilities: fileURLToPath(new URL('../runtime/scenario-test-capabilities.json', import.meta.url)),
    legacy: LEGACY_FILES.filter((relative) => exists(path.join(target, relative))),
    detectedBy, missing,
    note: status === 'installed' ? '运行时由安装方统一提供；doctor 核对 DSL 兼容性，旧副本按 legacy 提示清理。' : undefined,
  };
}

try {
  console.log(JSON.stringify(inspect(parseArgs(process.argv.slice(2))), null, 2));
} catch (error) {
  console.error(`scenario-test 项目检测失败：${error.message}`);
  process.exitCode = 2;
}

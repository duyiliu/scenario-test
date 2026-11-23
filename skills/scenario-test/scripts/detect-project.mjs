#!/usr/bin/env node
// 只读取当前工作目录及其父目录，外加用户级运行时目录的状态；不扫描其它项目、
// 不访问网络、不修改文件。运行时的下载由 ensure-runtime.mjs 负责——探测必须保持
// 只读，否则"问一句这个工具能干什么"都会触发 1.2 MB 下载。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_MARKERS = ['.git', 'pom.xml', 'settings.gradle', 'settings.gradle.kts', 'build.gradle', 'build.gradle.kts', 'package.json', 'go.mod', 'Cargo.toml', 'pyproject.toml'];
// v23 起运行时去项目化：项目只保留场景数据，执行/工作台统一用 Skill 运行时。
// 旧版 init 落盘的 .scenario-test 运行时副本按 legacy 报告，由 Skill 提示 --clean 清理。
const REQUIRED_FILES = ['scenario.config.js'];
const RUNTIME_FILES = [
  'scenario-test-cli.cjs',
  'scenario-test.umd.js',
  'scenario-test.d.ts',
  'scenario-test-capabilities.json',
  'AI_SCENARIO_PROMPT.md',
  'SCENARIO_PATTERNS.md',
];
const LEGACY_FILES = [
  '.scenario-test/scenario-test-cli.cjs',
  '.scenario-test/scenario-test.umd.js',
  '.scenario-test/scenario-test-capabilities.json',
  '.scenario-test/.scenario-test-version.json',
  'index.html',
];

// Skill 与运行时同版本：版本号取自 SKILL.md 的 metadata.version，运行时装在
// 用户级 ~/.scenario-test/runtime/<版本>/，与安装脚本落点一致。
function skillVersion() {
  const skillMd = fs.readFileSync(fileURLToPath(new URL('../SKILL.md', import.meta.url)), 'utf8');
  const match = /^\s*version:\s*"?([0-9][^"\n]*)"?\s*$/m.exec(skillMd);
  if (!match) throw new Error('SKILL.md 缺少 metadata.version');
  return match[1].trim();
}

function inspectRuntime(version) {
  const dir = path.join(os.homedir(), '.scenario-test', 'runtime', version);
  const manifestPath = path.join(dir, 'release.json');
  const base = {
    version,
    dir,
    cli: path.join(dir, 'scenario-test-cli.cjs'),
    authoringPrompt: path.join(dir, 'AI_SCENARIO_PROMPT.md'),
    patterns: path.join(dir, 'SCENARIO_PATTERNS.md'),
    capabilities: path.join(dir, 'scenario-test-capabilities.json'),
  };
  if (!exists(manifestPath)) return { ...base, status: 'missing' };
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    return { ...base, status: 'corrupt' };
  }
  if (manifest.version !== version) return { ...base, status: 'corrupt' };
  const missing = RUNTIME_FILES.filter((name) => !exists(path.join(dir, name)));
  if (missing.length) return { ...base, status: 'corrupt', missing };
  return { ...base, status: 'ready' };
}

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
  const runtime = inspectRuntime(skillVersion());
  return {
    status, projectRoot: root, scenarioDir: target,
    config: path.join(target, 'scenario.config.js'),
    // 项目不保留运行时副本，Skill 也不内嵌：cli 统一指向用户级版本化运行时目录。
    // runtime.status=missing 时调用方先跑 ensure-runtime.mjs 再继续。
    cli: runtime.cli,
    skillCli: runtime.cli,
    skillRuntime: runtime.dir,
    authoringPrompt: runtime.authoringPrompt,
    patterns: runtime.patterns,
    capabilities: runtime.capabilities,
    runtime: {
      status: runtime.status,
      version: runtime.version,
      dir: runtime.dir,
      install: fileURLToPath(new URL('./ensure-runtime.mjs', import.meta.url)),
    },
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

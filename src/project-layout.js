import fs from "node:fs";
import path from "node:path";

// v23 起运行时去项目化：执行、工作台与 AI 规则统一由安装方（Skill/安装脚本）的运行时提供，
// 项目目录只保留场景数据（scenario.config.js + scenarios/ + e2e/ 等），不再落 .scenario-test 副本。
export const INTERNAL_DIRECTORY = ".scenario-test";

// init --clean 与 doctor 据此识别旧版（v22 及以前）init/安装脚本落盘的项目内副本
export const LEGACY_FRAMEWORK_FILES = Object.freeze([
    `${INTERNAL_DIRECTORY}/AI_SCENARIO_PROMPT.md`,
    `${INTERNAL_DIRECTORY}/SCENARIO_PATTERNS.md`,
    `${INTERNAL_DIRECTORY}/scenario-test-cli.cjs`,
    `${INTERNAL_DIRECTORY}/scenario-test.umd.js`,
    `${INTERNAL_DIRECTORY}/scenario-test.d.ts`,
    `${INTERNAL_DIRECTORY}/scenario-test-capabilities.json`,
    `${INTERNAL_DIRECTORY}/.scenario-test-version.json`,
    `${INTERNAL_DIRECTORY}/e2e-reporter.cjs`,
    "index.html"
]);

function toRelativePath(...segments) {
    return path.join(...segments).replace(/\\/g, "/");
}

export function createProjectLayout(projectRoot, directory) {
    const publicDir = path.resolve(projectRoot, directory);
    return Object.freeze({
        publicDir,
        publicRelativePath: (fileName) => toRelativePath(directory, fileName)
    });
}

function isDirectory(target) {
    return fs.existsSync(target) && fs.statSync(target).isDirectory();
}

export function resolveProjectLayout(projectRoot, directory) {
    const layout = createProjectLayout(projectRoot, directory);
    if (fs.existsSync(layout.publicDir) && !isDirectory(layout.publicDir)) {
        throw new Error(`${layout.publicDir} 必须是目录；请移走同名文件后重试`);
    }
    return layout;
}

// 返回项目内仍存在的旧版运行时副本相对路径（无则空数组），供 doctor 提示与 init --clean 删除
export function listLegacyRuntimeFiles(publicDir) {
    return LEGACY_FRAMEWORK_FILES.filter((fileName) => fs.existsSync(path.join(publicDir, fileName)));
}

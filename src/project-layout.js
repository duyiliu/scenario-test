import fs from "node:fs";
import path from "node:path";

export const INTERNAL_DIRECTORY = ".scenario-test";

// 项目 .scenario-test/ 保存项目专属 AI 规则与模式库，以及随 init 落地的运行时副本
// （CLI/UMD/d.ts/capabilities/版本锁），保证离线双击可用且版本可被 doctor 校验。
export const FRAMEWORK_FILES = Object.freeze({
    authoringPrompt: "AI_SCENARIO_PROMPT.md",
    patterns: "SCENARIO_PATTERNS.md",
    cli: "scenario-test-cli.cjs",
    e2eReporter: "e2e-reporter.cjs",
    umd: "scenario-test.umd.js",
    dts: "scenario-test.d.ts",
    capabilities: "scenario-test-capabilities.json",
    versionLock: ".scenario-test-version.json"
});

function toRelativePath(...segments) {
    return path.join(...segments).replace(/\\/g, "/");
}

export function createProjectLayout(projectRoot, directory) {
    const publicDir = path.resolve(projectRoot, directory);
    const frameworkDir = path.join(publicDir, INTERNAL_DIRECTORY);
    const frameworkRelativeDir = toRelativePath(directory, INTERNAL_DIRECTORY);
    return Object.freeze({
        publicDir,
        frameworkDir,
        frameworkRelativeDir,
        publicRelativePath: (fileName) => toRelativePath(directory, fileName),
        frameworkRelativePath: (fileName) => toRelativePath(frameworkRelativeDir, fileName),
        frameworkPath: (fileName) => path.join(frameworkDir, fileName)
    });
}

function isDirectory(target) {
    return fs.existsSync(target) && fs.statSync(target).isDirectory();
}

// 统一使用 .scenario-test/ 内部目录放置 AI 规则、模式库与运行时副本。
export function resolveProjectLayout(projectRoot, directory) {
    const layout = createProjectLayout(projectRoot, directory);
    if (fs.existsSync(layout.frameworkDir) && !isDirectory(layout.frameworkDir)) {
        throw new Error(`${layout.frameworkDir} 必须是目录；请移走同名文件后重试`);
    }
    return layout;
}

export function resolveLayoutFromConfigDir(configDir) {
    return resolveProjectLayout(path.dirname(configDir), path.basename(configDir));
}

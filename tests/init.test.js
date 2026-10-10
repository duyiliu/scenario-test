import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import crypto from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import test from "node:test";
import { CONTRACT_VERSION } from "../src/index.js";
import { VERSION } from "../src/version.generated.js";

const root = path.resolve(import.meta.dirname, "..");
const cli = path.join(root, "src/cli.js");

function runInit(project, ...args) {
    return spawnSync(process.execPath, [cli, "init", "--project", project, ...args], { encoding: "utf8" });
}

// 异步运行 CLI：不阻塞本进程事件循环，供"同进程 HTTP server 提供下载源"的测试使用
function runCliAsync(cliPath, args, nodeArgs = []) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [...nodeArgs, cliPath, ...args], { encoding: "utf8" });
        let stdout = "";
        let stderr = "";
        let watchdogError = null;
        const watchdog = setTimeout(() => {
            watchdogError = new Error(`看门狗：子进程 10 秒未退出，已终止 ${cliPath}`);
            child.kill("SIGKILL");
        }, 10000);
        child.stdout.on("data", (chunk) => { stdout += chunk; });
        child.stderr.on("data", (chunk) => { stderr += chunk; });
        child.on("error", (error) => { clearTimeout(watchdog); reject(error); });
        child.on("close", (code, signal) => {
            clearTimeout(watchdog);
            if (watchdogError) reject(watchdogError);
            else resolve({ status: code, signal, stdout, stderr });
        });
    });
}

function assertGeneratedLayout(project, directory = "scenario-test") {
    const publicDir = path.join(project, ...directory.split("/"));
    const frameworkDir = path.join(publicDir, ".scenario-test");
    assert.deepEqual(fs.readdirSync(publicDir).sort(), [".scenario-test", "README.md", "index.html", "scenario.config.js", "start-scenario-test.cmd"]);
    // src 环境运行 init：CLI 副本从本机 dist 兜底拷贝，其余运行时副本与版本锁落盘
    assert.deepEqual(fs.readdirSync(frameworkDir).sort(), [
        ".scenario-test-version.json",
        "AI_SCENARIO_PROMPT.md",
        "SCENARIO_PATTERNS.md",
        "scenario-test-capabilities.json",
        "scenario-test-cli.cjs",
        "scenario-test.d.ts",
        "scenario-test.umd.js"
    ]);
    assert.match(
        fs.readFileSync(path.join(publicDir, "index.html"), "utf8"),
        /src="\.\/\.scenario-test\/scenario-test\.umd\.js"/
    );
    const startScript = fs.readFileSync(path.join(publicDir, "start-scenario-test.cmd"), "utf8");
    assert.ok(startScript.includes('"%~dp0.scenario-test\\scenario-test-cli.cjs" serve'), "cmd 应调用 .scenario-test 内 CLI 副本");
    assert.match(startScript, /scenario\.config\.js/);
    assert.match(startScript, /Start-Process/);
    assert.doesNotMatch(startScript, /4300/, "cmd 不应写死工作台端口");
    assert.match(startScript, /TcpListener/, "cmd 应向系统申请随机空闲端口");
    assert.match(startScript, /SCENARIO_TEST_PORT/);
    assert.match(startScript, /if not defined SCENARIO_TEST_PORT/);
    assert.doesNotMatch(startScript, /%RANDOM%/, "端口分配失败时不应退化为未经检测的随机端口");
    assert.match(startScript, /--port %SCENARIO_TEST_PORT%/);
    assert.match(startScript, /SCENARIO_TEST_URL=http:\/\/127\.0\.0\.1:%SCENARIO_TEST_PORT%\//);
    assert.match(
        fs.readFileSync(path.join(publicDir, "scenario.config.js"), "utf8"),
        /reference path="\.\/\.scenario-test\/scenario-test\.d\.ts"/
    );
    const lock = JSON.parse(fs.readFileSync(path.join(frameworkDir, ".scenario-test-version.json"), "utf8"));
    assert.equal(lock.runtimeVersion, VERSION);
    assert.equal(lock.contractVersion, CONTRACT_VERSION);
    assert.ok(lock.files.umd && lock.files.dts && lock.files.capabilities);
    return { publicDir, frameworkDir };
}

test("init 创建 npm-only 项目入口，且默认不覆盖项目文件", () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-init-"));
    try {
        const first = runInit(project);
        assert.equal(first.status, 0, first.stderr);
        const { publicDir, frameworkDir } = assertGeneratedLayout(project);
        const configPath = path.join(publicDir, "scenario.config.js");
        assert.match(fs.readFileSync(configPath, "utf8"), /ScenarioTest\.registerConfig/);
        assert.match(fs.readFileSync(configPath, "utf8"), /storagePrefix: "scenario-test\.scenario-test-init-/);
        assert.match(fs.readFileSync(configPath, "utf8"), /scenarios: \[]/);
        assert.equal(fs.existsSync(path.join(publicDir, "scenarios", "health.js")), false);

        const aiPrompt = fs.readFileSync(path.join(frameworkDir, "AI_SCENARIO_PROMPT.md"), "utf8");
        assert.match(aiPrompt, /AI 业务功能场景生成规则/);
        assert.match(aiPrompt, /用户不需要复制或粘贴本文件/);
        assert.match(aiPrompt, /只处理本次指定的一个业务功能/);
        assert.match(aiPrompt, /功能卡片/);
        assert.match(aiPrompt, /场景矩阵/);
        assert.match(aiPrompt, /不把多个业务功能串成一个大场景/);
        assert.match(aiPrompt, /required: true/);
        assert.match(aiPrompt, /逐文件自检/);

        const patterns = fs.readFileSync(path.join(frameworkDir, "SCENARIO_PATTERNS.md"), "utf8");
        assert.match(patterns, /创建、查询、精确清理/);
        assert.match(patterns, /业务功能是边界，场景是该功能下的一条独立验证路径/);
        assert.match(patterns, /不同验证路径使用独立场景/);

        const readme = fs.readFileSync(path.join(publicDir, "README.md"), "utf8");
        assert.match(readme, /不需要再次复制任何 Prompt/);
        assert.match(readme, /npx @yc_yzkj\/scenario-test/);
        assert.match(readme, /AI 负责维护 `scenario\.config\.js` 和 `scenarios\/`/);
        assert.match(readme, /一次只处理一个业务功能/);

        fs.writeFileSync(configPath, "// 用户配置\n", "utf8");
        const scenarioDir = path.join(publicDir, "scenarios");
        fs.mkdirSync(scenarioDir);
        fs.writeFileSync(path.join(scenarioDir, "user.js"), "// 用户场景\n", "utf8");
        const second = runInit(project);
        assert.equal(second.status, 0, second.stderr);
        assert.equal(fs.readFileSync(configPath, "utf8"), "// 用户配置\n");
        assert.equal(fs.readFileSync(path.join(scenarioDir, "user.js"), "utf8"), "// 用户场景\n");
    } finally {
        fs.rmSync(project, { recursive: true, force: true });
    }
});

test("init 重跑刷新 AI 规则与模式库，不覆盖项目配置", () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-init-refresh-"));
    try {
        const first = runInit(project);
        assert.equal(first.status, 0, first.stderr);
        const publicDir = path.join(project, "scenario-test");
        const frameworkDir = path.join(publicDir, ".scenario-test");
        const configPath = path.join(publicDir, "scenario.config.js");
        fs.writeFileSync(path.join(frameworkDir, "AI_SCENARIO_PROMPT.md"), "# 旧规则\n", "utf8");
        fs.writeFileSync(path.join(frameworkDir, "SCENARIO_PATTERNS.md"), "# 旧模式\n", "utf8");
        fs.writeFileSync(configPath, "// 用户配置\n", "utf8");

        const second = runInit(project);
        assert.equal(second.status, 0, second.stderr);
        assert.match(fs.readFileSync(path.join(frameworkDir, "AI_SCENARIO_PROMPT.md"), "utf8"), /AI 业务功能场景生成规则/);
        assert.match(fs.readFileSync(path.join(frameworkDir, "SCENARIO_PATTERNS.md"), "utf8"), /业务功能场景模式库/);
        assert.equal(fs.readFileSync(configPath, "utf8"), "// 用户配置\n");
    } finally {
        fs.rmSync(project, { recursive: true, force: true });
    }
});

test("init 为不同项目生成独立浏览器存储前缀", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-prefix-"));
    try {
        const firstProject = path.join(rootDir, "project-a");
        const secondProject = path.join(rootDir, "project-b");
        fs.mkdirSync(firstProject);
        fs.mkdirSync(secondProject);
        for (const project of [firstProject, secondProject]) {
            const result = runInit(project);
            assert.equal(result.status, 0, result.stderr);
        }
        const firstConfig = fs.readFileSync(path.join(firstProject, "scenario-test", "scenario.config.js"), "utf8");
        const secondConfig = fs.readFileSync(path.join(secondProject, "scenario-test", "scenario.config.js"), "utf8");
        assert.match(firstConfig, /storagePrefix: "scenario-test\.project-a"/);
        assert.match(secondConfig, /storagePrefix: "scenario-test\.project-b"/);
        assert.notEqual(firstConfig, secondConfig);
    } finally {
        fs.rmSync(rootDir, { recursive: true, force: true });
    }
});

test("init 支持嵌套项目内场景目录，浏览器 UMD 使用根路径", () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-init-dir-"));
    try {
        const result = runInit(project, "--dir", "dev/场景测试");
        assert.equal(result.status, 0, result.stderr);
        const { publicDir } = assertGeneratedLayout(project, "dev/场景测试");
        const index = fs.readFileSync(path.join(publicDir, "index.html"), "utf8");
        assert.match(index, /src="\.\/\.scenario-test\/scenario-test\.umd\.js"/);
    } finally {
        fs.rmSync(project, { recursive: true, force: true });
    }
});

test("init 统一迁移到 .scenario-test，不再采用旧平铺布局", () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-init-legacy-"));
    try {
        const publicDir = path.join(project, "scenario-test");
        fs.mkdirSync(publicDir, { recursive: true });
        fs.writeFileSync(path.join(publicDir, "AI_SCENARIO_PROMPT.md"), "# 旧平铺规则\n", "utf8");
        fs.writeFileSync(path.join(publicDir, "index.html"), '<script src="./scenario-test.umd.js"></script>\n', "utf8");

        const result = runInit(project);
        assert.equal(result.status, 0, result.stderr);
        assert.equal(fs.existsSync(path.join(publicDir, ".scenario-test", "AI_SCENARIO_PROMPT.md")), true);
        assert.equal(fs.readFileSync(path.join(publicDir, "AI_SCENARIO_PROMPT.md"), "utf8"), "# 旧平铺规则\n");
        assert.equal(fs.readFileSync(path.join(publicDir, "index.html"), "utf8"), '<script src="./scenario-test.umd.js"></script>\n');
        // 运行时副本仍按当前版本落盘到 .scenario-test/（平铺旧文件不删除，由用户决定清理）
        assert.equal(fs.existsSync(path.join(publicDir, ".scenario-test", "scenario-test.umd.js")), true);
        assert.equal(fs.existsSync(path.join(publicDir, ".scenario-test", ".scenario-test-version.json")), true);
    } finally {
        fs.rmSync(project, { recursive: true, force: true });
    }
});

test("init --no-input：目录已存在时不询问、退出 0、保留项目配置并刷新运行时", () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-init-noinput-"));
    try {
        const first = runInit(project);
        assert.equal(first.status, 0, first.stderr);
        // 用户随后维护了自己的配置（模拟真实项目已存在 scenario.config.js）
        const publicDir = path.join(project, "scenario-test");
        const customConfig = "ScenarioTest.registerConfig(ScenarioTest.defineConfig({baseUrl:'http://localhost:9999',scenarios:[]}));\n";
        fs.writeFileSync(path.join(publicDir, "scenario.config.js"), customConfig, "utf8");
        // 篡改版本锁模拟旧副本：把锁里的 UMD/CLI sha256 改成与磁盘失配的假值，
        // 使版本锁校验失败 → --no-input 应触发运行时刷新（升级旧副本的关键路径）
        const umdPath = path.join(publicDir, ".scenario-test", "scenario-test.umd.js");
        const cliCopyPath = path.join(publicDir, ".scenario-test", "scenario-test-cli.cjs");
        const realUmdSha = crypto.createHash("sha256").update(fs.readFileSync(umdPath)).digest("hex");
        const realCliSha = crypto.createHash("sha256").update(fs.readFileSync(cliCopyPath)).digest("hex");
        const lockPath = path.join(publicDir, ".scenario-test", ".scenario-test-version.json");
        const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
        lock.sha256["scenario-test.umd.js"] = "0".repeat(64);
        lock.sha256["scenario-test-cli.cjs"] = "0".repeat(64);
        fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n", "utf8");

        const second = runInit(project, "--no-input");
        assert.equal(second.status, 0, second.stderr);
        assert.doesNotMatch(second.stdout + second.stderr, /目标目录 .* 已存在/, "--no-input 不应出现交互提示");
        assert.equal(fs.readFileSync(path.join(publicDir, "scenario.config.js"), "utf8"), customConfig, "--no-input 应保留用户配置");
        // 刷新会重写版本锁为与磁盘实际匹配的 sha（副本内容与 dist 同源时字节不变，但锁必须被重写）
        const lockAfter = JSON.parse(fs.readFileSync(lockPath, "utf8"));
        assert.equal(lockAfter.sha256["scenario-test.umd.js"], realUmdSha, "--no-input 应把 UMD 版本锁 sha 重写为磁盘实际值");
        assert.equal(lockAfter.sha256["scenario-test-cli.cjs"], realCliSha, "--no-input 应把 CLI 版本锁 sha 重写为磁盘实际值");
    } finally {
        fs.rmSync(project, { recursive: true, force: true });
    }
});

test("init 在 .scenario-test 被同名文件占用时给出明确错误", () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-init-internal-file-"));
    try {
        const dir = path.join(project, "scenario-test");
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, ".scenario-test"), "occupied\n", "utf8");
        const result = runInit(project);
        assert.equal(result.status, 1);
        assert.match(result.stderr, /\.scenario-test 必须是目录/);
    } finally {
        fs.rmSync(project, { recursive: true, force: true });
    }
});

test("init 免 npm 模式：--library-url 下载全部运行时副本", async () => {
    const files = {
        "scenario-test-cli.cjs": "#!/usr/bin/env node\nconsole.log('mock cli');\n",
        "scenario-test.umd.js": `/*! scenario-test v${VERSION} */\nvar ScenarioTest = {};\n`,
        "scenario-test.d.ts": `// scenario-test v${VERSION}\nexport {};\n`,
        "scenario-test-capabilities.json": JSON.stringify({ schema: "scenario-test-capabilities", version: VERSION, contractVersion: CONTRACT_VERSION })
    };
    const server = http.createServer((request, response) => {
        const name = decodeURIComponent(request.url).replace(/^\//, "");
        if (files[name]) {
            response.writeHead(200, { "Content-Type": "application/octet-stream" });
            response.end(files[name]);
        } else {
            response.writeHead(404);
            response.end();
        }
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const sourceUrl = `http://127.0.0.1:${server.address().port}/`;
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-download-"));
    try {
        // 隔离 CLI 目录：模拟"本机只有单文件 CLI、无 dist、无 npm 包"的免 npm 场景
        const cliHome = path.join(project, "_cli");
        fs.mkdirSync(cliHome);
        fs.copyFileSync(path.join(root, "dist/scenario-test-cli.cjs"), path.join(cliHome, "scenario-test-cli.cjs"));
        // 用异步 spawn 运行 CLI：spawnSync 会阻塞本进程事件循环，同进程 HTTP server 将无法响应下载请求
        const result = await runCliAsync(path.join(cliHome, "scenario-test-cli.cjs"), [
            "init", "--project", project, "--dir", "scenario-test", "--library-url", sourceUrl
        ]);
        assert.equal(result.status, 0, result.stderr + result.stdout);
        const frameworkDir = path.join(project, "scenario-test", ".scenario-test");
        for (const fileName of ["scenario-test-cli.cjs", "scenario-test.umd.js", "scenario-test.d.ts", "scenario-test-capabilities.json"]) {
            assert.equal(fs.existsSync(path.join(frameworkDir, fileName)), true, `${fileName} 应下载落盘`);
        }
        assert.equal(fs.readFileSync(path.join(frameworkDir, "scenario-test.umd.js"), "utf8"), files["scenario-test.umd.js"]);
        const lock = JSON.parse(fs.readFileSync(path.join(frameworkDir, ".scenario-test-version.json"), "utf8"));
        assert.equal(lock.runtimeVersion, VERSION);
        assert.ok(lock.sha256["scenario-test.umd.js"], "版本锁应记录下载文件的 SHA256");
    } finally {
        // 等待 server 完全关闭（先断开 keep-alive 空闲连接，再等待 close 回调），避免端口与句柄残留
        server.closeAllConnections?.();
        await new Promise((resolve) => server.close(resolve));
        fs.rmSync(project, { recursive: true, force: true });
    }
});

const REMOTE_FILES = {
    "scenario-test-cli.cjs": "#!/usr/bin/env node\nconsole.log('mock cli');\n",
    "scenario-test.umd.js": `/*! scenario-test v${VERSION} */\nvar ScenarioTest = {};\n`,
    "scenario-test.d.ts": `// scenario-test v${VERSION}\nexport {};\n`,
    "scenario-test-capabilities.json": JSON.stringify({ schema: "scenario-test-capabilities", version: VERSION, contractVersion: CONTRACT_VERSION })
};

function writeRemotePreload(directory, recordFile, speedup) {
    const srcDir = path.dirname(cli);
    const candidates = [];
    for (const fileName of Object.keys(REMOTE_FILES)) {
        candidates.push(path.resolve(srcDir, fileName));
        candidates.push(path.resolve(srcDir, "../dist", fileName));
    }
    const preloadPath = path.join(directory, "preload.cjs");
    fs.writeFileSync(preloadPath, [
        'const fs = require("node:fs");',
        `const candidates = new Set(${JSON.stringify(candidates)});`,
        "const origExistsSync = fs.existsSync;",
        "fs.existsSync = function (target) {",
        "    if (candidates.has(String(target))) return false;",
        "    return origExistsSync.apply(fs, arguments);",
        "};",
        "const nativeTimeout = AbortSignal.timeout.bind(AbortSignal);",
        "AbortSignal.timeout = function (ms) {",
        `    fs.appendFileSync(${JSON.stringify(recordFile)}, String(ms) + "\\n");`,
        `    return nativeTimeout(${speedup ? "1000" : "ms"});`,
        "};",
        ""
    ].join("\n"), "utf8");
    return preloadPath;
}

async function closeServer(server) {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
}

test("init 源码远程下载成功：全部 4 个运行时文件落盘且版本锁匹配", async () => {
    const counts = {};
    const server = http.createServer((request, response) => {
        const name = decodeURIComponent(request.url).replace(/^\//, "");
        counts[name] = (counts[name] || 0) + 1;
        if (REMOTE_FILES[name]) {
            response.writeHead(200, { "Content-Type": "application/octet-stream" });
            response.end(REMOTE_FILES[name]);
        } else {
            response.writeHead(404);
            response.end();
        }
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-remote-ok-"));
    try {
        const recordFile = path.join(project, "signals.txt");
        fs.writeFileSync(recordFile, "", "utf8");
        const preloadPath = writeRemotePreload(project, recordFile, false);
        const result = await runCliAsync(cli, [
            "init", "--project", project, "--dir", "scenario-test",
            "--library-url", `http://127.0.0.1:${server.address().port}/`, "--no-input"
        ], ["--require", preloadPath]);
        assert.equal(result.status, 0, result.stderr + result.stdout);
        const frameworkDir = path.join(project, "scenario-test", ".scenario-test");
        for (const [fileName, content] of Object.entries(REMOTE_FILES)) {
            assert.equal(fs.readFileSync(path.join(frameworkDir, fileName), "utf8"), content, `${fileName} 落盘内容应等于 mock`);
            assert.equal(counts[fileName], 1, `${fileName} 应实际请求一次`);
        }
        const lock = JSON.parse(fs.readFileSync(path.join(frameworkDir, ".scenario-test-version.json"), "utf8"));
        assert.equal(lock.runtimeVersion, VERSION);
        for (const fileName of Object.keys(REMOTE_FILES)) {
            const realSha = crypto.createHash("sha256").update(REMOTE_FILES[fileName]).digest("hex");
            assert.equal(lock.sha256[fileName], realSha, `${fileName} 的锁 sha 应为下载内容哈希`);
        }
        const recorded = fs.readFileSync(recordFile, "utf8").trim().split("\n");
        assert.deepEqual(recorded, ["30000", "30000", "30000", "30000"], "4 次下载的超时预算均应为 30000ms");
    } finally {
        await closeServer(server);
        fs.rmSync(project, { recursive: true, force: true });
    }
});

test("init 源码远程下载响应头超时：FAIL 退出、不误落版本锁", async () => {
    const counts = {};
    const server = http.createServer((request, response) => {
        const name = decodeURIComponent(request.url).replace(/^\//, "");
        counts[name] = (counts[name] || 0) + 1;
        if (name === "scenario-test.umd.js") return;
        if (REMOTE_FILES[name]) {
            response.writeHead(200, { "Content-Type": "application/octet-stream" });
            response.end(REMOTE_FILES[name]);
        } else {
            response.writeHead(404);
            response.end();
        }
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-remote-stallh-"));
    try {
        const recordFile = path.join(project, "signals.txt");
        fs.writeFileSync(recordFile, "", "utf8");
        const preloadPath = writeRemotePreload(project, recordFile, true);
        const result = await runCliAsync(cli, [
            "init", "--project", project, "--dir", "scenario-test",
            "--library-url", `http://127.0.0.1:${server.address().port}/`, "--no-input"
        ], ["--require", preloadPath]);
        assert.equal(result.status, 1, result.stdout + result.stderr);
        assert.match(result.stderr, /scenario-test\.umd\.js 下载失败（下载超时（30 秒）/);
        assert.doesNotMatch(result.stdout, /已初始化项目/);
        const frameworkDir = path.join(project, "scenario-test", ".scenario-test");
        assert.equal(fs.existsSync(path.join(frameworkDir, "scenario-test.umd.js")), false, "超时文件不得落盘");
        assert.equal(fs.existsSync(path.join(frameworkDir, ".scenario-test-version.json")), false, "副本不完整不得落版本锁");
        assert.ok((counts["scenario-test.umd.js"] || 0) >= 1, "请求应实际到达本地 mock");
        const recorded = fs.readFileSync(recordFile, "utf8").trim().split("\n");
        assert.deepEqual(recorded, ["30000", "30000", "30000", "30000"], "4 次下载的超时预算均应为 30000ms");
    } finally {
        await closeServer(server);
        fs.rmSync(project, { recursive: true, force: true });
    }
});

test("init 源码远程下载响应体超时：收到头与部分 body 但不 end 同样中止", async () => {
    const counts = {};
    const server = http.createServer((request, response) => {
        const name = decodeURIComponent(request.url).replace(/^\//, "");
        counts[name] = (counts[name] || 0) + 1;
        if (name === "scenario-test.umd.js") {
            response.writeHead(200, { "Content-Type": "application/octet-stream" });
            response.write("partial-body");
            response.flushHeaders();
            return;
        }
        if (REMOTE_FILES[name]) {
            response.writeHead(200, { "Content-Type": "application/octet-stream" });
            response.end(REMOTE_FILES[name]);
        } else {
            response.writeHead(404);
            response.end();
        }
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-remote-stallb-"));
    try {
        const recordFile = path.join(project, "signals.txt");
        fs.writeFileSync(recordFile, "", "utf8");
        const preloadPath = writeRemotePreload(project, recordFile, true);
        const result = await runCliAsync(cli, [
            "init", "--project", project, "--dir", "scenario-test",
            "--library-url", `http://127.0.0.1:${server.address().port}/`, "--no-input"
        ], ["--require", preloadPath]);
        assert.equal(result.status, 1, result.stdout + result.stderr);
        assert.match(result.stderr, /scenario-test\.umd\.js 下载失败（下载超时（30 秒）/);
        assert.doesNotMatch(result.stdout, /已初始化项目/);
        const frameworkDir = path.join(project, "scenario-test", ".scenario-test");
        assert.equal(fs.existsSync(path.join(frameworkDir, "scenario-test.umd.js")), false, "超时文件不得落盘");
        assert.equal(fs.existsSync(path.join(frameworkDir, ".scenario-test-version.json")), false, "副本不完整不得落版本锁");
        assert.ok((counts["scenario-test.umd.js"] || 0) >= 1, "请求应实际到达本地 mock");
        const recorded = fs.readFileSync(recordFile, "utf8").trim().split("\n");
        assert.deepEqual(recorded, ["30000", "30000", "30000", "30000"], "4 次下载的超时预算均应为 30000ms");
    } finally {
        await closeServer(server);
        fs.rmSync(project, { recursive: true, force: true });
    }
});

function seedStaleRuntime(dir) {
    const publicDir = path.join(dir, "scenario-test");
    const frameworkDir = path.join(publicDir, ".scenario-test");
    fs.mkdirSync(frameworkDir, { recursive: true });
    const staleFiles = {};
    for (const fileName of Object.keys(REMOTE_FILES)) {
        const content = `stale ${fileName} v0.0.1`;
        staleFiles[fileName] = content;
        fs.writeFileSync(path.join(frameworkDir, fileName), content, "utf8");
    }
    const sha256 = {};
    for (const [fileName, content] of Object.entries(staleFiles)) {
        sha256[fileName] = crypto.createHash("sha256").update(content).digest("hex");
    }
    const lockPath = path.join(frameworkDir, ".scenario-test-version.json");
    const lockText = JSON.stringify({
        runtimeVersion: "0.0.1",
        contractVersion: CONTRACT_VERSION,
        files: { cli: "scenario-test-cli.cjs", umd: "scenario-test.umd.js", dts: "scenario-test.d.ts", capabilities: "scenario-test-capabilities.json" },
        sha256
    }, null, 2);
    fs.writeFileSync(lockPath, lockText, "utf8");
    const configPath = path.join(publicDir, "scenario.config.js");
    const configText = "ScenarioTest.registerConfig(ScenarioTest.defineConfig({baseUrl:'http://localhost:9999',scenarios:[]}));\n";
    fs.writeFileSync(configPath, configText, "utf8");
    return { frameworkDir, lockPath, lockText, configPath, configText, staleFiles };
}

function startRemoteServer(failName) {
    const counts = {};
    const server = http.createServer((request, response) => {
        const name = decodeURIComponent(request.url).replace(/^\//, "");
        counts[name] = (counts[name] || 0) + 1;
        if (name === failName) {
            response.writeHead(503);
            response.end();
            return;
        }
        if (REMOTE_FILES[name]) {
            response.writeHead(200, { "Content-Type": "application/octet-stream" });
            response.end(REMOTE_FILES[name]);
        } else {
            response.writeHead(404);
            response.end();
        }
    });
    return { counts, server };
}

test("init 源码远程升级：部分文件下载失败时退出 1，旧副本与旧版本锁原样保留", async () => {
    const { counts, server } = startRemoteServer("scenario-test.umd.js");
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-remote-upfail-"));
    try {
        const dir = path.join(project, "work");
        fs.mkdirSync(dir, { recursive: true });
        const seeded = seedStaleRuntime(dir);
        const recordFile = path.join(project, "signals.txt");
        fs.writeFileSync(recordFile, "", "utf8");
        const preloadPath = writeRemotePreload(project, recordFile, false);
        const result = await runCliAsync(cli, [
            "init", "--project", dir, "--dir", "scenario-test",
            "--library-url", `http://127.0.0.1:${server.address().port}/`, "--no-input"
        ], ["--require", preloadPath]);
        assert.equal(result.status, 1, `应退出 1，stdout: ${result.stdout} stderr: ${result.stderr}`);
        assert.match(result.stderr, /运行时副本更新失败/);
        assert.match(result.stderr, /umd/);
        assert.doesNotMatch(result.stdout, /已初始化项目/);
        assert.equal(fs.readFileSync(path.join(seeded.frameworkDir, "scenario-test.umd.js"), "utf8"), seeded.staleFiles["scenario-test.umd.js"], "失败时旧 UMD 字节不得被删除或覆盖");
        assert.equal(fs.readFileSync(seeded.lockPath, "utf8"), seeded.lockText, "失败时旧版本锁文本不得被改写");
        assert.equal(fs.readFileSync(seeded.configPath, "utf8"), seeded.configText, "用户配置不得被覆盖");
        for (const fileName of Object.keys(REMOTE_FILES)) {
            assert.equal(counts[fileName], 1, `${fileName} 应实际请求一次`);
        }
        const recorded = fs.readFileSync(recordFile, "utf8").trim().split("\n");
        assert.deepEqual(recorded, ["30000", "30000", "30000", "30000"], "4 次下载的超时预算均应为 30000ms");
    } finally {
        await closeServer(server);
        fs.rmSync(project, { recursive: true, force: true });
    }
});

test("init 源码远程升级：全部下载成功时刷新副本并重写版本锁", async () => {
    const { counts, server } = startRemoteServer(null);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const project = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-remote-upok-"));
    try {
        const dir = path.join(project, "work");
        fs.mkdirSync(dir, { recursive: true });
        const seeded = seedStaleRuntime(dir);
        const recordFile = path.join(project, "signals.txt");
        fs.writeFileSync(recordFile, "", "utf8");
        const preloadPath = writeRemotePreload(project, recordFile, false);
        const result = await runCliAsync(cli, [
            "init", "--project", dir, "--dir", "scenario-test",
            "--library-url", `http://127.0.0.1:${server.address().port}/`, "--no-input"
        ], ["--require", preloadPath]);
        assert.equal(result.status, 0, result.stderr + result.stdout);
        for (const [fileName, content] of Object.entries(REMOTE_FILES)) {
            assert.equal(fs.readFileSync(path.join(seeded.frameworkDir, fileName), "utf8"), content, `${fileName} 应刷新为下载内容`);
            assert.equal(counts[fileName], 1, `${fileName} 应实际请求一次`);
        }
        const lock = JSON.parse(fs.readFileSync(seeded.lockPath, "utf8"));
        assert.equal(lock.runtimeVersion, VERSION);
        assert.equal(lock.contractVersion, CONTRACT_VERSION);
        for (const fileName of Object.keys(REMOTE_FILES)) {
            const realSha = crypto.createHash("sha256").update(REMOTE_FILES[fileName]).digest("hex");
            assert.equal(lock.sha256[fileName], realSha, `${fileName} 的锁 sha 应更新为新内容哈希`);
        }
        assert.equal(fs.readFileSync(seeded.configPath, "utf8"), seeded.configText, "用户配置不得被覆盖");
        const recorded = fs.readFileSync(recordFile, "utf8").trim().split("\n");
        assert.deepEqual(recorded, ["30000", "30000", "30000", "30000"], "4 次下载的超时预算均应为 30000ms");
    } finally {
        await closeServer(server);
        fs.rmSync(project, { recursive: true, force: true });
    }
});

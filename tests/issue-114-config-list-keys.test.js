import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import test from "node:test";
import { defineConfig } from "../src/registry.js";
import { resolveStartupProxyTarget } from "../src/cli/serve-server.js";

// Issue #114：清单项未知键未校验（manual 拼成 manul 会绕过 --all 排除），
// envs/scenarios 非数组被静默降级为 []，--env 在无 envs 配置里被静默忽略。
test("#114：场景清单项拼错的键定义期即拒绝，兼容写法仍放行", () => {
    assert.throws(
        () => defineConfig({ scenarios: [{ id: "danger", url: "scenarios/a.js", manul: true }] }),
        /未知键 "manul"/
    );
    assert.throws(
        () => defineConfig({ scenarios: [{ id: "x", url: "scenarios/a.js", tgas: ["a"] }] }),
        /未知键 "tgas"/
    );
    assert.doesNotThrow(() => defineConfig({ scenarios: [{ id: "x", url: "scenarios/a.js", manual: true, tags: ["a"] }] }));
    // url 的兼容回退写法 file/path 不是未知键
    assert.doesNotThrow(() => defineConfig({ scenarios: [{ id: "x", file: "scenarios/a.js" }] }));
    assert.doesNotThrow(() => defineConfig({ scenarios: [{ id: "x", path: "scenarios/a.js" }] }));
    assert.doesNotThrow(() => defineConfig({ scenarios: ["scenarios/a.js"] }));
});

test("#114：envs/scenarios 声明了但不是数组时拒绝，而不是静默当空", () => {
    assert.throws(() => defineConfig({ envs: {} }), /envs 必须是数组/);
    assert.throws(() => defineConfig({ envs: "local" }), /envs 必须是数组/);
    assert.throws(() => defineConfig({ scenarios: {} }), /scenarios 必须是数组/);
    // 未声明时仍允许（保持既有语义）
    assert.doesNotThrow(() => defineConfig({}));
});

function runCli(args) {
    const cli = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), "src", "cli.js");
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [cli, ...args], { stdio: ["ignore", "pipe", "pipe"] });
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (chunk) => { stdout += chunk; });
        child.stderr.on("data", (chunk) => { stderr += chunk; });
        child.on("error", reject);
        child.on("close", (code) => resolve({ code, stdout, stderr }));
    });
}

test("#114：配置没有 envs 时显式 --env 报错，不静默回落顶层 baseUrl", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-issue-114-"));
    try {
        fs.mkdirSync(path.join(dir, "scenarios"));
        fs.writeFileSync(path.join(dir, "scenarios", "a.js"), `ScenarioTest.registerScenario("a", ScenarioTest.defineScenario({
            name: "示例",
            steps: [{ name: "调用", path: "ping", status: 200 }]
        }));`, "utf8");
        fs.writeFileSync(path.join(dir, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({
            baseUrl: "http://127.0.0.1:1",
            scenarios: [{ id: "a", url: "scenarios/a.js" }]
        }));`, "utf8");
        const result = await runCli(["run", "--config", path.join(dir, "scenario.config.js"), "--scenario", "a", "--env", "prod"]);
        assert.equal(result.code, 1);
        assert.match(`${result.stdout}${result.stderr}`, /未声明 envs/);
        // serve 的启动解析同口径
        const startup = resolveStartupProxyTarget({ baseUrl: "http://127.0.0.1:1" }, "prod", "");
        assert.match(startup.error, /未声明 envs/);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

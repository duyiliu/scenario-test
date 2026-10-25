import assert from "node:assert/strict";
import test from "node:test";
import { defineConfig } from "../src/registry.js";
import { contract } from "../src/contract.js";

// Issue #61：defineConfig 以前对顶层/env/variable 的未知键直接 ...input 透传，
// requestTimeoutsMs/baseUrll/require 这类拼写错误被静默忽略；baseUrl 缺失或协议
// 错误也直到真正执行才报错。这里锁定定义期校验与契约投射。
test("config 契约声明顶层/env/variable 白名单与 baseUrl 回退规则", () => {
    assert.ok(contract.config.configKeys.includes("requestTimeoutMs"));
    assert.ok(contract.config.configKeys.includes("storageKeys"));
    assert.ok(contract.config.configKeys.includes("baseUrl"));
    assert.ok(contract.config.environmentKeys.includes("baseUrl"));
    assert.ok(contract.config.variableKeys.includes("required"));
    assert.equal(contract.config.baseUrl.protocol, "http(s)");
    assert.match(contract.config.baseUrl.note, /回退顶层 baseUrl/);
});

test("defineConfig 拒绝配置顶层未知键，并提示正确字段名", () => {
    assert.throws(
        () => defineConfig({ requestTimeoutsMs: 1000 }),
        /配置 包含未知键 "requestTimeoutsMs".*requestTimeoutMs/
    );
    assert.throws(
        () => defineConfig({ envs: [{ key: "local", name: "本地", baseUrl: "http://localhost" }], scenario: [] }),
        /配置 包含未知键 "scenario"/
    );
});

test("defineConfig 拒绝 env/variable 未知键，并提示正确字段名", () => {
    assert.throws(
        () => defineConfig({ envs: [{ key: "local", name: "本地", baseUrll: "http://localhost" }] }),
        /第 1 个环境 包含未知键 "baseUrll".*baseUrl/
    );
    assert.throws(
        () => defineConfig({ variables: [{ name: "token", require: true }] }),
        /变量 token 包含未知键 "require".*required/
    );
});

test("defineConfig 校验 baseUrl 必须是 http(s):// URL", () => {
    assert.throws(
        () => defineConfig({ envs: [{ key: "local", name: "本地", baseUrl: "localhost:8080" }] }),
        /环境 local 的 baseUrl 必须以 http:\/\/ 或 https:\/\//
    );
    assert.throws(
        () => defineConfig({ envs: [{ key: "local", name: "本地", baseUrl: "ftp://example.com" }] }),
        /环境 local 的 baseUrl 必须以 http:\/\/ 或 https:\/\//
    );
    assert.throws(
        () => defineConfig({ baseUrl: "ftp://example.com" }),
        /配置顶层 baseUrl 必须以 http:\/\/ 或 https:\/\//
    );
});

test("defineConfig 校验 variables 字段类型", () => {
    assert.throws(
        () => defineConfig({ variables: [{ name: "token", required: "yes" }] }),
        /变量 token 的 required 必须是布尔值/
    );
    assert.throws(
        () => defineConfig({ variables: [{ name: "token", label: 123 }] }),
        /变量 token 的 label 必须是字符串/
    );
    assert.doesNotThrow(() => defineConfig({ variables: [{ name: "token", label: "令牌", required: true, defaultValue: "" }] }));
});

test("合法旧配置不受影响：环境可省略 baseUrl 回退顶层 baseUrl，http(s) 与历史 envVars 照常放行", () => {
    const config = defineConfig({
        baseUrl: "https://api.example.com",
        envs: [{ key: "local", name: "本地" }],
        storageKeys: { theme: "custom.theme" },
        envVars: { legacyToken: "LEGACY_TOKEN" },
        variables: [{ name: "token", required: true }],
        scenarios: [{ id: "health", url: "scenarios/health.js", manual: true }]
    });
    assert.equal(config.envs[0].baseUrl, undefined);
    assert.equal(config.baseUrl, "https://api.example.com");
    assert.equal(config.variables[0].required, true);
    assert.deepEqual(config.storageKeys, { theme: "custom.theme" });
    assert.doesNotThrow(() => defineConfig({
        envs: [{ key: "local", name: "本地", baseUrl: "http://localhost:8080" }],
        vars: { token: "t" }
    }));
});

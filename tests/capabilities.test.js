import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { buildCapabilities, contract, renderCapabilitiesText } from "../src/index.js";

const root = path.resolve(import.meta.dirname, "..");
const cli = path.join(root, "src/cli.js");

test("capabilities JSON 结构直接来自 contract 且序列化稳定", () => {
    const caps = buildCapabilities(contract);
    assert.equal(caps.schema, "scenario-test-capabilities");
    assert.equal(caps.version, contract.runtimeVersion);
    assert.equal(caps.contractVersion, contract.contractVersion);
    assert.deepEqual(Object.keys(caps.assertions.operators), Object.keys(contract.assertions.operators));
    assert.deepEqual(caps.assertions.metaKeys, [...contract.assertions.metaKeys]);
    assert.deepEqual(caps.assertions.targets, ["status", "duration"]);
    assert.deepEqual(caps.assertions.from, [...contract.assertions.from], "断言 from 白名单必须对外投射（contract v8 新增消费面）");
    assert.deepEqual(caps.assertions.numericOperators, [...contract.assertions.numericOperators]);
    assert.deepEqual(caps.when.sources, ["vars", "lastResponse", "status"]);
    assert.deepEqual(caps.when.targets, ["status"]);
    assert.deepEqual(caps.extract.from, [...contract.extract.from]);
    assert.deepEqual(caps.extract.targets, [...contract.extract.targets]);
    assert.deepEqual(caps.extract.metaKeys, [...contract.extract.metaKeys]);
    assert.equal(caps.extract.default, contract.extract.default);
    assert.deepEqual(caps.reservedVars, [...contract.reservedVars]);
    assert.deepEqual(caps.generatedVars.types, [...contract.generatedVars.types]);
    assert.deepEqual(caps.globals.types, [...contract.globals.types]);
    assert.deepEqual(caps.cli.commands, [...contract.cli.commands]);
    assert.ok(caps.cli.options["fail-on-skip"]);
    assert.ok(caps.cli.options.bail);
    assert.equal(caps.cli.options.json.kind, "flag");
    assert.equal(caps.config.manual.type, "boolean");
    // 每个操作符含说明与类型约束
    for (const [name, meta] of Object.entries(caps.assertions.operators)) {
        assert.equal(typeof meta.description, "string");
        assert.equal(typeof meta.valueType, "string");
    }
    assert.equal(JSON.stringify(buildCapabilities(contract)), JSON.stringify(buildCapabilities(contract)));
});

test("capabilities 文本：版本、操作符、when、extract、保留变量、manual、关键命令", () => {
    const text = renderCapabilitiesText(buildCapabilities(contract));
    assert.match(text, new RegExp(`scenario-test v${contract.runtimeVersion}`));
    assert.match(text, new RegExp(`contract v${contract.contractVersion}`));
    for (const op of Object.keys(contract.assertions.operators)) {
        assert.match(text, new RegExp(`\\b${op}\\b`), `文本缺少操作符 ${op}`);
    }
    assert.match(text, /断言目标 target: status \/ duration/);
    assert.match(text, /断言来源 from: body \/ vars \/ headers \/ bodyText/);
    assert.match(text, /提取目标 target: status/);
    assert.match(text, /when 条件来源: vars \/ lastResponse \/ status/);
    assert.match(text, /when 响应级 target: status/);
    assert.match(text, /extract/);
    assert.match(text, /runId/);
    assert.match(text, /runNo/);
    assert.match(text, /manual/);
    assert.match(text, /capabilities/);
    assert.match(text, /doctor/);
    assert.match(text, /--fail-on-skip/);
    assert.match(text, /--bail/);
});

test("CLI capabilities --json：stdout 纯净且可直接解析，与 build 产物一致", () => {
    const result = spawnSync(process.execPath, [cli, "capabilities", "--json"], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.version, contract.runtimeVersion);
    assert.deepEqual(Object.keys(parsed.assertions.operators), Object.keys(contract.assertions.operators));
    // 与构建产物同源：不维护第二套 JSON 源（产物存在时校验）
    const distPath = path.join(root, "dist", "scenario-test-capabilities.json");
    if (fs.existsSync(distPath)) {
        const distCaps = JSON.parse(fs.readFileSync(distPath, "utf8"));
        // capabilities 文件是发布产物；本地仅在与当前源码版本同步时比对，避免旧 dist 干扰 npm-only 布局测试
        if (distCaps.version === contract.runtimeVersion) {
            assert.deepEqual(parsed, distCaps);
        }
    } else {
        // 未构建时无法比对产物，但 stdout 纯净性已由 JSON.parse 全量解析保证
    }
});

test("CLI capabilities 文本输出面向人类", () => {
    const result = spawnSync(process.execPath, [cli, "capabilities"], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /能力清单/);
    assert.match(result.stdout, /断言操作符/);
});
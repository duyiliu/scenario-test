// capabilities 构建与渲染 —— 唯一 JSON 源是 src/contract.js
//
// - buildCapabilities(contract) 产出稳定、可序列化的能力清单对象；
//   文本输出与 dist/scenario-test-capabilities.json 均从该对象投影。
// - JSON 结构直接来自 contract，不维护第二套 JSON 源。
import { contract, CONTRACT_VERSION } from "./contract.js";

export function buildCapabilities(inputContract = contract) {
    const { assertions, when, extract, reservedVars, generatedVars, globals, config, retryUntil, scenario, cli } = inputContract;
    return {
        schema: "scenario-test-capabilities",
        version: inputContract.runtimeVersion,
        contractVersion: inputContract.contractVersion,
        assertions: {
            operators: Object.fromEntries(
                Object.entries(assertions.operators).map(([name, meta]) => [name, { description: meta.description, valueType: meta.valueType }])
            ),
            metaKeys: [...assertions.metaKeys],
            targets: [...(assertions.targets || [])],
            from: [...(assertions.from || [])],
            note: assertions.note,
            numericOperators: [...assertions.numericOperators],
            ...(assertions.shape ? {
                shape: {
                    keys: [...assertions.shape.keys],
                    types: [...assertions.shape.types],
                    ...(assertions.shape.note ? { note: assertions.shape.note } : {})
                }
            } : {})
        },
        when: {
            sources: [...when.sources],
            targets: [...(when.targets || [])],
            note: when.note
        },
        extract: {
            metaKeys: [...(extract.metaKeys || [])],
            from: [...extract.from],
            scopes: [...(extract.scopes || [])],
            targets: [...(extract.targets || [])],
            required: extract.required,
            default: extract.default,
            note: extract.note
        },
        reservedVars: [...reservedVars],
        generatedVars: {
            types: [...generatedVars.types]
        },
        globals: {
            types: [...globals.types],
            note: globals.note
        },
        config: {
            configKeys: [...config.configKeys],
            scenarioItemKeys: [...config.scenarioItemKeys],
            environmentKeys: [...config.environmentKeys],
            variableKeys: [...config.variableKeys],
            baseUrl: {
                protocol: config.baseUrl.protocol,
                note: config.baseUrl.note
            },
            manual: { ...config.manual },
            tags: { ...(config.tags || {}) }
        },
        retryUntil: {
            keys: [...retryUntil.keys],
            retryOn: [...retryUntil.retryOn],
            defaultRetryOn: [...retryUntil.defaultRetryOn],
            note: retryUntil.note
        },
        scenario: {
            keys: [...scenario.keys],
            stepKeys: [...scenario.stepKeys],
            failurePolicies: [...scenario.failurePolicies],
            retryUntilKeys: [...(scenario.retryUntilKeys || [])],
            ...(scenario.note ? { note: scenario.note } : {})
        },
        cli: {
            commands: [...cli.commands],
            options: Object.fromEntries(
                Object.entries(cli.options).map(([name, spec]) => [
                    name,
                    {
                        kind: spec.kind,
                        description: spec.description,
                        ...(spec.parse ? { parse: spec.parse } : {}),
                        ...(spec.repeatable ? { repeatable: true } : {}),
                        ...(spec.aliases ? { aliases: [...spec.aliases] } : {})
                    }
                ])
            )
        }
    };
}

function operatorLine(name, meta) {
    const typeHint = meta.valueType === "finiteNumber" ? "（仅有限 number）" : meta.valueType === "any" ? "" : `（${meta.valueType}）`;
    return `  ${name.padEnd(10)}${meta.description}${typeHint}`;
}

export function renderCapabilitiesText(capabilities) {
    const lines = [];
    lines.push(`scenario-test v${capabilities.version} — 能力清单（contract v${capabilities.contractVersion}）`);
    lines.push("");
    lines.push("断言操作符（assertions.operators）:");
    for (const [name, meta] of Object.entries(capabilities.assertions.operators)) {
        lines.push(operatorLine(name, meta));
    }
    lines.push(`  元数据键: ${capabilities.assertions.metaKeys.join(" / ")}`);
    if (capabilities.assertions.targets?.length) {
        lines.push(`  断言目标 target: ${capabilities.assertions.targets.join(" / ")}（duration 为单次请求耗时毫秒，见 response.durationMs）`);
    }
    if (capabilities.assertions.from?.length) {
        lines.push(`  断言来源 from: ${capabilities.assertions.from.join(" / ")}（默认 body）`);
    }
    if (capabilities.assertions.note) {
        lines.push(`  ${capabilities.assertions.note}`);
    }
    if (capabilities.assertions.shape) {
        lines.push(`  shape 支持: type = ${capabilities.assertions.shape.types.join(" / ")}；键 = ${capabilities.assertions.shape.keys.join(" / ")}`);
        if (capabilities.assertions.shape.note) lines.push(`  ${capabilities.assertions.shape.note}`);
    }
    lines.push("");
    lines.push(`when 条件来源: ${capabilities.when.sources.join(" / ")}`);
    if (capabilities.when.targets?.length) {
        lines.push(`  when 响应级 target: ${capabilities.when.targets.join(" / ")}（读上一步响应）`);
    }
    lines.push(`  ${capabilities.when.note}`);
    lines.push("");
    lines.push(`extract: from = ${capabilities.extract.from.join(" | ")}（默认 body）, required: ${capabilities.extract.required}`);
    if (capabilities.extract.scopes?.length) {
        lines.push(`  提取作用域 scope: ${capabilities.extract.scopes.join(" / ")}（suite 写入本次 run 共享变量）`);
    }
    if (capabilities.extract.targets?.length) {
        lines.push(`  提取目标 target: ${capabilities.extract.targets.join(" / ")}；允许字段: ${capabilities.extract.metaKeys.join(" / ")}`);
    }
    lines.push(`  ${capabilities.extract.note}`);
    lines.push("");
    lines.push(`保留变量: ${capabilities.reservedVars.join(" / ")}`);
    lines.push("");
    lines.push(`generatedVars 类型: ${capabilities.generatedVars.types.join(" / ")}`);
    lines.push("");
    lines.push(`globals 类型: ${capabilities.globals.types.join(" / ")}`);
    lines.push("");
    lines.push(`config 顶层字段: ${capabilities.config.configKeys.join(" / ")}`);
    lines.push(`config.scenarios 项字段: ${capabilities.config.scenarioItemKeys.join(" / ")}`);
    lines.push(`  baseUrl（${capabilities.config.baseUrl.protocol}）: ${capabilities.config.baseUrl.note}`);
    lines.push(`  manual（${capabilities.config.manual.type}）: ${capabilities.config.manual.note}`);
    lines.push("");
    lines.push(`场景结构: ${capabilities.scenario.keys.join(" / ")}；步骤字段: ${capabilities.scenario.stepKeys.join(" / ")}`);
    lines.push(`failurePolicy: ${capabilities.scenario.failurePolicies.join(" / ")}`);
    if (capabilities.retryUntil) {
        lines.push(`retryUntil 字段: ${capabilities.retryUntil.keys.join(" / ")}；retryOn: ${capabilities.retryUntil.retryOn.join(" / ")}（默认 ${capabilities.retryUntil.defaultRetryOn.join(" / ")}）`);
        lines.push(`  ${capabilities.retryUntil.note}`);
    }
    if (capabilities.scenario.note) lines.push(`  ${capabilities.scenario.note}`);
    lines.push("");
    lines.push("CLI 命令:");
    for (const command of capabilities.cli.commands) {
        lines.push(`  node scenario-test-cli.cjs ${command}`);
    }
    lines.push("关键选项:");
    for (const [name, spec] of Object.entries(capabilities.cli.options)) {
        const flags = [`--${name}`, ...(spec.aliases || []).map((alias) => `--${alias}`)].join(" / ");
        lines.push(`  ${flags.padEnd(36)}${spec.description}`);
    }
    return lines.join("\n");
}

// 供 index.js 导出（三方可通过 import { contract, CONTRACT_VERSION } 或 capabilities 相关 API 消费）
export const CAPABILITIES_SCHEMA = "scenario-test-capabilities";
export { contract, CONTRACT_VERSION };
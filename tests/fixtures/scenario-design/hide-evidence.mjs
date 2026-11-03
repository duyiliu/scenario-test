#!/usr/bin/env node
// 证据隐藏变体（issue #107 方向 2）：删掉 docs/API.md 里可直接抄的错误码，
// 只保留 ErrorCode.java / GlobalExceptionHandler 作为错误契约的事实来源。
//
// 用于回答：当错误响应不在文档里明写、必须自己检索统一异常契约时，
// skill 规则是否仍能产出精确断言，而不是把整条规则标「待确认」。
//
// 用法: node hide-evidence.mjs <order-adjust 项目目录>
// 退出码: 0 成功；2 未匹配到预期文本（避免静默不生效）。

import fs from "node:fs";
import path from "node:path";

const target = process.argv[2];
if (!target) {
    process.stderr.write("用法: node hide-evidence.mjs <项目目录>\n");
    process.exit(2);
}

const apiPath = path.join(target, "docs", "API.md");
if (!fs.existsSync(apiPath)) {
    process.stderr.write(`未找到 ${apiPath}\n`);
    process.exit(2);
}

let text = fs.readFileSync(apiPath, "utf8");

const edits = [
    {
        name: "失败响应示例",
        find: [
            "- 失败响应示例：",
            "",
            "```json",
            '{ "code": 40901, "message": "调整数量超过可调上限", "data": null }',
            "```",
            ""
        ].join("\n"),
        replace: "- 失败响应示例从略：具体 `code` 与 `message` 以服务端实现为准。\n"
    },
    {
        name: "错误码表",
        find: [
            "## 错误码",
            "",
            "错误码来源为 `com.example.order.ErrorCode`，与 `GlobalExceptionHandler` 的映射一致。",
            "",
            "| code | 含义 | 触发条件 |",
            "| --- | --- | --- |",
            "| 40001 | 调整数量必须大于 0 | `quantity` 为空、0 或负数 |",
            "| 40401 | 原订单不存在 | `orderId` 在订单库中查不到 |",
            "| 40402 | 调整单不存在 | 按 id 查询或审批时不存在 |",
            "| 40901 | 调整数量超过可调上限 | `quantity > 原订单可调数量` |",
            "| 40903 | 当前状态不允许该操作 | 非 `PENDING` 状态执行审批 |",
            ""
        ].join("\n"),
        replace: "## 错误码\n\n错误码定义见 `com.example.order.ErrorCode`。\n"
    },
    {
        name: "详情接口错误码",
        find: "不存在时返回 `code = 40402`。",
        replace: "不存在时返回失败响应。"
    },
    {
        name: "审批接口错误码",
        find: "非 `PENDING` 状态调用返回 `code = 40903`，状态保持不变。",
        replace: "非 `PENDING` 状态调用返回失败响应，状态保持不变。"
    }
];

for (const edit of edits) {
    if (!text.includes(edit.find)) {
        process.stderr.write(`证据隐藏失败：未匹配「${edit.name}」\n`);
        process.exit(2);
    }
    text = text.replace(edit.find, edit.replace);
}

const leaked = ["40001", "40401", "40402", "40901", "40903"].filter((code) => text.includes(code));
if (leaked.length > 0) {
    process.stderr.write(`证据隐藏失败：API.md 仍包含错误码 ${leaked.join(", ")}\n`);
    process.exit(2);
}

fs.writeFileSync(apiPath, text);
process.stdout.write("已隐藏 docs/API.md 中的错误码细节（保留 ErrorCode 枚举）\n");

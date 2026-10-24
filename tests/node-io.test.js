import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createNodeIo } from "../src/node.js";
import { createEngine, defineScenario } from "../src/index.js";

function makeWorkspace() {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-io-"));
    fs.writeFileSync(path.join(workspace, "sample.txt"), "upload-payload", "utf8");
    return workspace;
}

test("createUploadBody：对象定义映射 fieldName/filename/fields 并构造 FormData", async () => {
    const workspace = makeWorkspace();
    try {
        const io = createNodeIo(workspace);
        const upload = await io.createUploadBody({
            filePath: "sample.txt",
            fieldName: "attachment",
            filename: "renamed.txt",
            fields: { note: "hello", count: 3 }
        });
        assert.equal(upload.omitContentType, true);
        assert.ok(upload.body instanceof FormData);
        const file = upload.body.get("attachment");
        assert.ok(file instanceof File, "字段应是 File");
        assert.equal(file.name, "renamed.txt");
        assert.equal(await file.text(), "upload-payload");
        // 附加字段值统一转字符串
        assert.equal(upload.body.get("note"), "hello");
        assert.equal(upload.body.get("count"), "3");
    } finally {
        fs.rmSync(workspace, { recursive: true, force: true });
    }
});

test("createUploadBody：字符串定义回退 file 字段与 basename 文件名", async () => {
    const workspace = makeWorkspace();
    try {
        const io = createNodeIo(workspace);
        const upload = await io.createUploadBody("sample.txt");
        const file = upload.body.get("file");
        assert.ok(file instanceof File);
        assert.equal(file.name, "sample.txt");
        assert.equal(await file.text(), "upload-payload");
    } finally {
        fs.rmSync(workspace, { recursive: true, force: true });
    }
});

test("createUploadBody：路径穿越与空路径拒绝", async () => {
    const workspace = makeWorkspace();
    try {
        const io = createNodeIo(workspace);
        await assert.rejects(
            () => io.createUploadBody("../outside.txt"),
            /文件上传路径不安全[\s\S]*路径越界/
        );
        await assert.rejects(
            () => io.createUploadBody("/etc/passwd"),
            /文件上传路径不安全[\s\S]*不允许使用绝对路径/
        );
        await assert.rejects(() => io.createUploadBody(""), /文件上传路径不安全/);
    } finally {
        fs.rmSync(workspace, { recursive: true, force: true });
    }
});

test("createUploadBody：工作区内不存在的文件报错", async () => {
    const workspace = makeWorkspace();
    try {
        const io = createNodeIo(workspace);
        await assert.rejects(() => io.createUploadBody("missing.txt"), /上传文件不存在/);
    } finally {
        fs.rmSync(workspace, { recursive: true, force: true });
    }
});

test("createUploadBody：maxUploadBytes 超限返回结构化错误，边界值与调用级覆盖生效", async () => {
    const workspace = makeWorkspace();
    try {
        const sampleSize = fs.statSync(path.join(workspace, "sample.txt")).size;
        const exact = createNodeIo(workspace, { maxUploadBytes: sampleSize });
        const upload = await exact.createUploadBody("sample.txt");
        assert.equal(upload.body.get("file").size, sampleSize);

        const limited = createNodeIo(workspace, { maxUploadBytes: sampleSize - 1 });
        await assert.rejects(
            () => limited.createUploadBody("sample.txt"),
            (error) => {
                assert.match(error.message, /上传文件超过大小上限/);
                assert.deepEqual(error.uploadTooLarge, { actualBytes: sampleSize, limitBytes: sampleSize - 1 });
                return true;
            }
        );

        // 本次运行传入的上限优先于 createNodeIo 默认值
        const overridden = createNodeIo(workspace, { maxUploadBytes: 1024 });
        await assert.rejects(
            () => overridden.createUploadBody("sample.txt", null, { maxUploadBytes: sampleSize - 1 }),
            /上传文件超过大小上限/
        );
    } finally {
        fs.rmSync(workspace, { recursive: true, force: true });
    }
});

// ==================== 安全边界 ====================

test("saveResponseStream：流式写入内容与 saveResponse 一致，失败时删除半截文件", async () => {
    const workspace = makeWorkspace();
    try {
        const io = createNodeIo(workspace);
        const data = new TextEncoder().encode("streamed-content-".repeat(500));
        const stream = new ReadableStream({
            start(controller) {
                controller.enqueue(data.subarray(0, 1024));
                controller.enqueue(data.subarray(1024));
                controller.close();
            }
        });
        const streamed = await io.saveResponseStream("responses/streamed.bin", stream, { contentType: "application/octet-stream" });
        const buffered = await io.saveResponse("responses/buffered.bin", data, { contentType: "application/octet-stream" });
        assert.equal(streamed.size, data.byteLength);
        assert.equal(streamed.contentType, "application/octet-stream");
        assert.deepEqual(fs.readFileSync(streamed.savedTo), Buffer.from(data));
        assert.deepEqual(fs.readFileSync(streamed.savedTo), fs.readFileSync(buffered.savedTo));

        // 流中途失败（引擎的 responseTooLarge 包装流同样走此路径）不得留下半截文件
        let sent = false;
        const broken = new ReadableStream({
            pull(controller) {
                if (!sent) {
                    sent = true;
                    controller.enqueue(new Uint8Array([1, 2, 3]));
                } else {
                    controller.error(new Error("模拟流中断"));
                }
            }
        });
        await assert.rejects(() => io.saveResponseStream("responses/broken.bin", broken), /模拟流中断/);
        assert.equal(fs.existsSync(path.join(workspace, "responses", "broken.bin")), false);
    } finally {
        fs.rmSync(workspace, { recursive: true, force: true });
    }
});

test("maxResponseBytes + saveResponseAs：超限结构化报错且不留下半截文件", async () => {
    const workspace = makeWorkspace();
    try {
        const engine = createEngine({
            baseUrl: "https://mock.local",
            maxResponseBytes: 5,
            io: createNodeIo(workspace),
            fetch: async () => new Response("1234567890", { headers: { "Content-Type": "application/octet-stream" } })
        });
        const report = await engine.runScenario(defineScenario({
            name: "超限保存",
            steps: [{ name: "下载", path: "big", saveResponseAs: "out/big.bin" }]
        }));
        const result = report.results[0];
        assert.equal(result.errorCode, "responseTooLarge");
        assert.deepEqual(result.responseTooLarge, { actualBytes: 10, limitBytes: 5 });
        assert.equal(fs.existsSync(path.join(workspace, "out", "big.bin")), false);

        // 恰好等于上限时完整落盘（流式路径与旧 saveResponse 内容一致）
        const exactEngine = createEngine({
            baseUrl: "https://mock.local",
            maxResponseBytes: 10,
            io: createNodeIo(workspace),
            fetch: async () => new Response("1234567890")
        });
        const exactReport = await exactEngine.runScenario(defineScenario({
            name: "边界保存",
            steps: [{ name: "下载", path: "exact", saveResponseAs: "out/exact.bin" }]
        }));
        assert.equal(exactReport.results[0].passed, true);
        assert.equal(fs.readFileSync(path.join(workspace, "out", "exact.bin"), "utf8"), "1234567890");
    } finally {
        fs.rmSync(workspace, { recursive: true, force: true });
    }
});

test("saveResponse：递归建目录写入并返回 savedTo/size/contentType", async () => {
    const workspace = makeWorkspace();
    try {
        const io = createNodeIo(workspace);
        const data = new TextEncoder().encode('{"ok":true}');
        const saved = await io.saveResponse("responses/run-1/detail.json", data, { contentType: "application/json" });
        assert.equal(saved.size, data.byteLength);
        assert.equal(saved.contentType, "application/json");
        assert.equal(path.dirname(saved.savedTo), path.join(workspace, "responses", "run-1"));
        assert.deepEqual(fs.readFileSync(saved.savedTo), Buffer.from(data));
    } finally {
        fs.rmSync(workspace, { recursive: true, force: true });
    }
});

test("saveResponse：路径穿越拒绝，工作区外不可写", async () => {
    const workspace = makeWorkspace();
    try {
        const io = createNodeIo(workspace);
        const data = new TextEncoder().encode("x");
        await assert.rejects(
            () => io.saveResponse("../escape.json", data),
            /响应保存路径不安全[\s\S]*路径越界/
        );
        await assert.rejects(
            () => io.saveResponse("sub/../../escape.json", data),
            /响应保存路径不安全/
        );
        assert.equal(fs.existsSync(path.join(path.dirname(workspace), "escape.json")), false);
    } finally {
        fs.rmSync(workspace, { recursive: true, force: true });
    }
});

test("junction/符号链接越界：词法在界内但实路径出界的上传与保存均拒绝", async (t) => {
    const workspace = makeWorkspace();
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-outside-"));
    try {
        fs.writeFileSync(path.join(outside, "secret.txt"), "out-of-bounds", "utf8");
        const link = path.join(workspace, "link");
        try {
            // Windows junction 不需要管理员权限；其他平台退回符号链接语义一致
            fs.symlinkSync(outside, link, "junction");
        } catch (error) {
            t.skip(`当前平台不支持目录链接: ${error.message}`);
            return;
        }
        const io = createNodeIo(workspace);
        // link/secret.txt 词法路径在工作区内，但实路径越界——必须按 realpath 判越界
        await assert.rejects(
            () => io.createUploadBody("link/secret.txt"),
            /文件上传路径不安全[\s\S]*越界/
        );
        await assert.rejects(
            () => io.saveResponse("link/out.bin", new TextEncoder().encode("x")),
            /响应保存路径不安全[\s\S]*越界/
        );
        assert.equal(fs.existsSync(path.join(outside, "out.bin")), false, "不得写出到链接目标目录");
    } finally {
        fs.rmSync(workspace, { recursive: true, force: true });
        fs.rmSync(outside, { recursive: true, force: true });
    }
});

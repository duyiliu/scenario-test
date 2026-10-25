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

        // 显式 0/负数/NaN/Infinity 覆盖 IO 默认上限，全部按“不限制”处理
        const disabled = createNodeIo(workspace, { maxUploadBytes: sampleSize - 1 });
        for (const limit of [0, -1, Number.NaN, Infinity]) {
            const allowed = await disabled.createUploadBody("sample.txt", null, { maxUploadBytes: limit });
            assert.equal(allowed.body.get("file").size, sampleSize, `maxUploadBytes=${String(limit)} 应覆盖默认上限`);
        }
        // undefined/null 表示未声明，回落到 IO 默认上限
        for (const limit of [undefined, null]) {
            await assert.rejects(
                () => disabled.createUploadBody("sample.txt", null, { maxUploadBytes: limit }),
                /上传文件超过大小上限/,
                `maxUploadBytes=${String(limit)} 应回落默认上限`
            );
        }
        // 正数小数按字节向下取整
        const floored = createNodeIo(workspace, { maxUploadBytes: sampleSize - 0.1 });
        await assert.rejects(
            () => floored.createUploadBody("sample.txt"),
            (error) => {
                assert.deepEqual(error.uploadTooLarge, { actualBytes: sampleSize, limitBytes: sampleSize - 1 });
                return true;
            }
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

        // 目标文件已存在时，失败只清理本次临时文件，原文件内容保持完整
        const existingPath = path.join(workspace, "responses", "existing.bin");
        fs.writeFileSync(existingPath, "sentinel-content", "utf8");
        let sentExisting = false;
        const brokenExisting = new ReadableStream({
            pull(controller) {
                if (!sentExisting) {
                    sentExisting = true;
                    controller.enqueue(new Uint8Array([9, 9, 9]));
                } else {
                    controller.error(new Error("已有文件写入中断"));
                }
            }
        });
        await assert.rejects(() => io.saveResponseStream("responses/existing.bin", brokenExisting), /已有文件写入中断/);
        assert.equal(fs.readFileSync(existingPath, "utf8"), "sentinel-content");

        // 非 Error 拒绝值同样必须收尾：不挂起、原文件不被破坏、不残留临时文件
        const nonErrorPath = path.join(workspace, "responses", "nonerror.bin");
        fs.writeFileSync(nonErrorPath, "keep-me", "utf8");
        let sentString = false;
        const brokenString = new ReadableStream({
            pull(controller) {
                if (!sentString) {
                    sentString = true;
                    controller.enqueue(new Uint8Array([7, 7, 7]));
                } else {
                    controller.error("模拟非 Error 中断");
                }
            }
        });
        await assert.rejects(
            () => io.saveResponseStream("responses/nonerror.bin", brokenString),
            (error) => {
                assert.equal(error, "模拟非 Error 中断");
                return true;
            }
        );
        assert.equal(fs.readFileSync(nonErrorPath, "utf8"), "keep-me");
        // 无 .part 临时文件残留
        assert.deepEqual(
            fs.readdirSync(path.join(workspace, "responses")).sort(),
            ["buffered.bin", "existing.bin", "nonerror.bin", "streamed.bin"]
        );
    } finally {
        fs.rmSync(workspace, { recursive: true, force: true });
    }
});

test("saveResponseStream：符号链接目标跟随链接更新真实文件并保留链接", async (t) => {
    const workspace = makeWorkspace();
    try {
        const io = createNodeIo(workspace);
        const targetPath = path.join(workspace, "target.bin");
        const linkPath = path.join(workspace, "link.bin");
        fs.writeFileSync(targetPath, "old-content", "utf8");
        try {
            // 相对链接：旧 writeFileSync 会跟随并更新 target.bin，链接本身保持不变
            fs.symlinkSync("target.bin", linkPath, "file");
        } catch (error) {
            t.skip(`当前平台不支持文件符号链接: ${error.message}`);
            return;
        }
        const data = new TextEncoder().encode("new-streamed-content");
        const saved = await io.saveResponseStream("link.bin", new ReadableStream({
            start(controller) {
                controller.enqueue(data);
                controller.close();
            }
        }), { contentType: "application/octet-stream" });
        assert.equal(fs.lstatSync(linkPath).isSymbolicLink(), true, "链接本身应保留");
        assert.equal(fs.readFileSync(targetPath, "utf8"), "new-streamed-content");
        assert.equal(saved.savedTo, linkPath);
        assert.equal(saved.size, data.byteLength);

        // 失败时同样不破坏链接与其目标已有内容
        fs.writeFileSync(targetPath, "keep-target", "utf8");
        let sent = false;
        const broken = new ReadableStream({
            pull(controller) {
                if (!sent) {
                    sent = true;
                    controller.enqueue(new Uint8Array([1, 2, 3]));
                } else {
                    controller.error(new Error("链接写入中断"));
                }
            }
        });
        await assert.rejects(() => io.saveResponseStream("link.bin", broken), /链接写入中断/);
        assert.equal(fs.lstatSync(linkPath).isSymbolicLink(), true);
        assert.equal(fs.readFileSync(targetPath, "utf8"), "keep-target");
        assert.deepEqual(fs.readdirSync(workspace).sort(), ["link.bin", "sample.txt", "target.bin"]);
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
        assert.deepEqual(result.responseTooLarge, { bytesRead: 10, limitBytes: 5 });
        assert.equal(fs.existsSync(path.join(workspace, "out", "big.bin")), false);

        // 目标文件已存在时超限失败不得破坏原文件
        const existingPath = path.join(workspace, "out", "existing.bin");
        fs.mkdirSync(path.dirname(existingPath), { recursive: true });
        fs.writeFileSync(existingPath, "sentinel-content", "utf8");
        const existingReport = await engine.runScenario(defineScenario({
            name: "超限保存到已有文件",
            steps: [{ name: "下载", path: "big", saveResponseAs: "out/existing.bin" }]
        }));
        assert.equal(existingReport.results[0].errorCode, "responseTooLarge");
        assert.equal(fs.readFileSync(existingPath, "utf8"), "sentinel-content");
        assert.deepEqual(fs.readdirSync(path.join(workspace, "out")), ["existing.bin"]);

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

test("saveResponseStream：流式保存响应体挂起时超时/用户取消均及时返回并清理在途文件", async () => {
    const workspace = makeWorkspace();
    const createHangingResponse = () => new Response(new ReadableStream({
        start(controller) {
            controller.enqueue(new TextEncoder().encode("partial"));
        },
        pull() {
            // 模拟完全不感知 fetch signal 的服务端：首块后永不结束
            return new Promise(() => {});
        }
    }), { headers: { "Content-Type": "application/octet-stream" } });
    const scenario = defineScenario({
        name: "流式挂起",
        steps: [{ name: "下载", path: "hang", saveResponseAs: "out/hang.bin" }]
    });
    const noHang = (promise, label) => Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`${label}未及时返回`)), 2000))
    ]);
    try {
        const timeoutEngine = createEngine({
            baseUrl: "https://mock.local",
            requestTimeoutMs: 50,
            io: createNodeIo(workspace),
            fetch: async () => createHangingResponse()
        });
        const timedOut = await noHang(timeoutEngine.runScenario(scenario), "超时");
        assert.equal(timedOut.results[0].status, "TIMEOUT");
        assert.equal(fs.existsSync(path.join(workspace, "out", "hang.bin")), false);

        const controller = new AbortController();
        const cancelEngine = createEngine({
            baseUrl: "https://mock.local",
            io: createNodeIo(workspace),
            fetch: async () => createHangingResponse()
        });
        const pending = cancelEngine.runScenario(scenario, { signal: controller.signal });
        setTimeout(() => controller.abort(), 50);
        const cancelled = await noHang(pending, "取消");
        assert.equal(cancelled.results[0].status, "CANCELLED");
        assert.equal(fs.existsSync(path.join(workspace, "out", "hang.bin")), false);
        assert.deepEqual(fs.readdirSync(path.join(workspace, "out")), []);
    } finally {
        fs.rmSync(workspace, { recursive: true, force: true });
    }
});

test("run options 显式 undefined 不覆盖引擎级 maxResponseBytes/maxUploadBytes", async () => {
    const workspace = makeWorkspace();
    try {
        const sampleSize = fs.statSync(path.join(workspace, "sample.txt")).size;
        let fetchCalls = 0;
        const uploadEngine = createEngine({
            baseUrl: "https://mock.local",
            maxUploadBytes: 5,
            io: createNodeIo(workspace),
            fetch: async () => {
                fetchCalls += 1;
                return new Response("{}");
            }
        });
        const uploadReport = await uploadEngine.runScenario(defineScenario({
            name: "上传限额",
            steps: [{ name: "上传", method: "POST", request: { fileUpload: { filePath: "sample.txt" } } }]
        }), { maxUploadBytes: undefined });
        const uploadResult = uploadReport.results[0];
        assert.equal(uploadResult.errorCode, "uploadTooLarge");
        assert.deepEqual(uploadResult.uploadTooLarge, { actualBytes: sampleSize, limitBytes: 5 });
        assert.equal(fetchCalls, 0, "超限应在发起上传前被拒绝");

        const responseEngine = createEngine({
            baseUrl: "https://mock.local",
            maxResponseBytes: 5,
            fetch: async () => new Response("123456")
        });
        const responseReport = await responseEngine.runScenario(defineScenario({
            name: "下载限额",
            steps: [{ name: "下载", path: "big" }]
        }), { maxResponseBytes: undefined });
        const responseResult = responseReport.results[0];
        assert.equal(responseResult.errorCode, "responseTooLarge");
        assert.deepEqual(responseResult.responseTooLarge, { bytesRead: 6, limitBytes: 5 });
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

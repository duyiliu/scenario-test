import fs from "node:fs";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { SAVED_RESPONSE, normalizeByteLimit } from "../core.js";
import { validatePath } from "../utils/path-validator.js";

export function createNodeIo(workspace = process.cwd(), options = {}) {
    const root = path.resolve(workspace);
    const defaultMaxUploadBytes = normalizeByteLimit(options.maxUploadBytes);

    function resolveUploadPath(filePath) {
        try {
            return validatePath(root, filePath);
        } catch (error) {
            throw new Error(
                `文件上传路径不安全: ${filePath}\n` +
                `原因: ${error.message}\n` +
                `提示: 上传文件必须在工作区内 (${root})`
            );
        }
    }

    function resolveSavePath(relativePath) {
        try {
            return validatePath(root, relativePath);
        } catch (error) {
            throw new Error(
                `响应保存路径不安全: ${relativePath}\n` +
                `原因: ${error.message}\n` +
                `提示: 保存路径必须在工作区内 (${root})`
            );
        }
    }

    // 与旧 writeFileSync 的口径一致：保存到符号链接时跟随链接更新目标，而不是
    // 用临时文件 rename 替换链接本身。支持相对链接、链接链与指向尚未创建目标的情况。
    function resolveWriteTarget(absolutePath) {
        let current = absolutePath;
        const seen = new Set();
        for (let depth = 0; depth < 32; depth += 1) {
            let stat;
            try {
                stat = fs.lstatSync(current);
            } catch (error) {
                if (error.code === "ENOENT") return current;
                throw error;
            }
            if (!stat.isSymbolicLink()) return current;
            if (seen.has(current)) throw new Error(`响应保存路径包含符号链接循环: ${absolutePath}`);
            seen.add(current);
            const linkTarget = fs.readlinkSync(current);
            current = path.resolve(path.dirname(current), linkTarget);
        }
        throw new Error(`响应保存路径符号链接层级过深: ${absolutePath}`);
    }

    return {
        async createUploadBody(definition, runtime, callOptions = {}) {
            const filePath = typeof definition === "string" ? definition : definition.filePath;
            const absolutePath = resolveUploadPath(filePath);
            if (!fs.existsSync(absolutePath)) throw new Error(`上传文件不存在: ${absolutePath}`);

            const stat = fs.statSync(absolutePath);
            if (!stat.isFile()) throw new Error(`上传路径不是文件: ${absolutePath}`);
            // 上限优先取本次运行（config/run options），其次取 createNodeIo 的默认值。
            // 显式 0/负数/NaN/Infinity 归一化为 0（不限制）并覆盖默认值；只有 undefined/null
            // 才表示调用方未声明、回落到 IO 默认上限。
            const callMaxUploadBytes = callOptions?.maxUploadBytes;
            const maxUploadBytes = callMaxUploadBytes === undefined || callMaxUploadBytes === null
                ? defaultMaxUploadBytes
                : normalizeByteLimit(callMaxUploadBytes);
            if (maxUploadBytes > 0 && stat.size > maxUploadBytes) {
                const error = new Error(`上传文件超过大小上限: 实际 ${stat.size} 字节，限制 ${maxUploadBytes} 字节`);
                error.scenarioUploadTooLarge = true;
                error.uploadTooLarge = { actualBytes: stat.size, limitBytes: maxUploadBytes };
                throw error;
            }

            const fieldName = definition.fieldName || "file";
            const filename = definition.filename || path.basename(absolutePath);
            const form = new FormData();
            // Node 19.8+ 的 openAsBlob 让 FormData 直接引用文件（无需整文件入内存）；
            // Node 18 没有该 API 时回退 readFileSync，保持既有兼容性。
            // Windows 上 Blob 的文件句柄要到垃圾回收后才关闭，上传后文件仍被占用，
            // 删除/覆盖工作区会报 ENOTEMPTY/EPERM；因此在 Windows 统一回退为内存 Blob。
            const canOpenAsBlob = typeof fs.openAsBlob === "function" && process.platform !== "win32";
            const blob = canOpenAsBlob
                ? await fs.openAsBlob(absolutePath)
                : new Blob([fs.readFileSync(absolutePath)]);
            form.append(fieldName, blob, filename);
            for (const [name, value] of Object.entries(definition.fields || {})) form.append(name, String(value));
            return { body: form, omitContentType: true };
        },
        async saveResponse(relativePath, data, metadata = {}) {
            const absolutePath = resolveSavePath(relativePath);
            fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
            fs.writeFileSync(absolutePath, data);
            // SAVED_RESPONSE 标记：CLI 据此确认真实发生过保存——业务响应恰好含
            // savedTo/size 字段时不会被误吞（Symbol 不可经 JSON 伪造）
            return { savedTo: absolutePath, size: data.byteLength, contentType: metadata.contentType || "", [SAVED_RESPONSE]: true };
        },
        async saveResponseStream(relativePath, body, metadata = {}) {
            const absolutePath = resolveSavePath(relativePath);
            const writeTarget = resolveWriteTarget(absolutePath);
            // 链接链可能指向工作区外（包括悬空链接）：真实写入位置同样必须过边界检查
            if (writeTarget !== absolutePath) {
                try {
                    validatePath(root, writeTarget, { allowAbsolute: true });
                } catch (error) {
                    throw new Error(
                        `响应保存路径不安全: ${relativePath}\n` +
                        `原因: ${error.message}\n` +
                        `提示: 保存路径必须在工作区内 (${root})`
                    );
                }
            }
            const directory = path.dirname(writeTarget);
            fs.mkdirSync(directory, { recursive: true });
            // 先写同目录临时文件，成功后才原子替换目标：失败/超限只清理本次临时文件，
            // 不破坏目标路径上已有的完整文件
            const tempPath = path.join(
                directory,
                `.${path.basename(writeTarget)}.part-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`
            );
            const file = fs.createWriteStream(tempPath);
            let size = 0;
            const counter = new Transform({
                transform(chunk, _encoding, callback) {
                    size += chunk.byteLength;
                    callback(null, chunk);
                }
            });
            try {
                const source = body == null
                    ? Readable.from([])
                    : (typeof body.getReader === "function" ? Readable.fromWeb(body) : body);
                await pipeline(source, counter, file);
                // 写到链接指向的真实文件：保留链接本身，内容与旧 writeFileSync 一致
                fs.renameSync(tempPath, writeTarget);
            } catch (error) {
                // 任何失败（含引擎包装流的 responseTooLarge / 超时取消 / 非 Error 拒绝值）
                // 都不留下半截文件，也不影响目标路径原有文件
                if (!file.closed) {
                    await new Promise((resolveClose) => {
                        file.once("close", resolveClose);
                        file.destroy();
                    });
                }
                fs.rmSync(tempPath, { force: true });
                throw error;
            }
            return { savedTo: absolutePath, size, contentType: metadata.contentType || "", [SAVED_RESPONSE]: true };
        }
    };
}

import fs from "node:fs";
import path from "node:path";
import { SAVED_RESPONSE } from "../core.js";
import { validatePath } from "../utils/path-validator.js";

export function createNodeIo(workspace = process.cwd()) {
    const root = path.resolve(workspace);
    return {
        async createUploadBody(definition) {
            const filePath = typeof definition === "string" ? definition : definition.filePath;

            // ✅ 验证上传文件路径
            let absolutePath;
            try {
                absolutePath = validatePath(root, filePath);
            } catch (error) {
                throw new Error(
                    `文件上传路径不安全: ${filePath}\n` +
                    `原因: ${error.message}\n` +
                    `提示: 上传文件必须在工作区内 (${root})`
                );
            }

            if (!fs.existsSync(absolutePath)) throw new Error(`上传文件不存在: ${absolutePath}`);
            const fieldName = definition.fieldName || "file";
            const filename = definition.filename || path.basename(absolutePath);
            const form = new FormData();
            form.append(fieldName, new Blob([fs.readFileSync(absolutePath)]), filename);
            for (const [name, value] of Object.entries(definition.fields || {})) form.append(name, String(value));
            return { body: form, omitContentType: true };
        },
        async saveResponse(relativePath, data, metadata = {}) {
            // ✅ 验证保存路径
            let absolutePath;
            try {
                absolutePath = validatePath(root, relativePath);
            } catch (error) {
                throw new Error(
                    `响应保存路径不安全: ${relativePath}\n` +
                    `原因: ${error.message}\n` +
                    `提示: 保存路径必须在工作区内 (${root})`
                );
            }

            fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
            fs.writeFileSync(absolutePath, data);
            // SAVED_RESPONSE 标记：CLI 据此确认真实发生过保存——业务响应恰好含
            // savedTo/size 字段时不会被误吞（Symbol 不可经 JSON 伪造）
            return { savedTo: absolutePath, size: data.byteLength, contentType: metadata.contentType || "", [SAVED_RESPONSE]: true };
        }
    };
}

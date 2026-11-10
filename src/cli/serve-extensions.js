// serve 项目扩展：workspace/serve-extensions/*.mjs 各导出
//   default { name, handle(request, response, pathname) => boolean | Promise<boolean> }
// handle 返回 true（或响应已结束）表示已接管；返回 false 继续走静态文件/接口代理。
// 扩展文件是项目自有可执行代码（与 scenario.config.js / scenarios/ 同信任级别），
// 常用于把项目内的浏览器 e2e 触发器等本地能力挂进工作台同一服务与端口。
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const SERVE_EXTENSIONS_DIR = "serve-extensions";

export async function loadServeExtensions(workspace, { warn = console.warn } = {}) {
    const dir = path.join(workspace, SERVE_EXTENSIONS_DIR);
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return [];
    const extensions = [];
    const files = fs.readdirSync(dir).filter((file) => file.endsWith(".mjs")).sort();
    for (const file of files) {
        try {
            const mod = await import(pathToFileURL(path.join(dir, file)).href);
            const extension = mod.default ?? mod.extension;
            if (!extension || typeof extension.name !== "string" || typeof extension.handle !== "function") {
                warn(`警告: serve 扩展 ${file} 导出不符合约定（需要 default { name, handle }），已跳过`);
                continue;
            }
            extensions.push({ ...extension, file });
        } catch (error) {
            warn(`警告: serve 扩展 ${file} 加载失败（${error.message}），已跳过`);
        }
    }
    return extensions;
}

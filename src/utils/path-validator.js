/**
 * 安全路径验证工具
 * 防止路径遍历攻击 (CWE-22)
 *
 * @module path-validator
 */
import fs from "node:fs";
import path from "node:path";

/**
 * 真实路径边界检查（junction/符号链接防护）
 *
 * 词法 resolve+relative 检查管不住目录联接点：workspace/link -> outside 时
 * link/secret.txt 词法在界内、真实读写落到界外。此处把路径沿「最近存在的祖先」
 * realpath 后拼回剩余段，再做一次边界判断。
 *
 * @param {string} root - 允许的根目录（绝对路径）
 * @param {string} resolved - 已通过词法边界检查的目标绝对路径
 * @param {string} userPath - 原始用户输入（仅用于错误消息）
 * @throws {Error} 真实路径越界或无法解析真实路径时
 */
// 对路径沿「最近存在的祖先」realpath 后拼回剩余段——目标或根目录不存在时，
// junction 链接点可能在其祖先链任一级（含根目录自身的祖先），只 realpath 末端会漏判
function resolveToRealPath(candidate) {
    let probe = candidate;
    const pending = [];
    while (!fs.existsSync(probe)) {
        const parent = path.dirname(probe);
        if (parent === probe) break;
        pending.unshift(path.basename(probe));
        probe = parent;
    }
    const real = fs.realpathSync(probe);
    return pending.length ? path.join(real, ...pending) : real;
}

function assertRealPathWithinRoot(root, resolved, userPath) {
    // 根目录及其祖先链同样可能含链接点：root 不存在时沿同一算法求真身；
    // 完全解析不出（盘符无效等极端情况）回落词法路径
    let realRoot;
    try {
        realRoot = resolveToRealPath(root);
    } catch {
        realRoot = path.resolve(root);
    }
    let full;
    try {
        full = resolveToRealPath(resolved);
    } catch (error) {
        // 祖先存在却 realpath 失败（权限/竞争删除等）：fail-closed，不回退词法放行
        throw new Error(`无法解析路径真实位置: ${userPath}（${error.message}）`);
    }
    const relative = path.relative(realRoot, full);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
        throw new Error(`路径经链接/联接点越界: ${userPath}`);
    }
}

/**
 * 判断词法已解析的绝对路径经符号链接解析后是否仍在根目录内（不抛错）
 *
 * @param {string} root - 允许的根目录
 * @param {string} resolved - 词法解析后的目标绝对路径
 * @returns {boolean} 真实路径在界内返回 true
 */
export function isRealPathWithinRoot(root, resolved) {
    try {
        assertRealPathWithinRoot(root, resolved, resolved);
        return true;
    } catch {
        return false;
    }
}

/**
 * 验证用户提供的路径是否在允许的根目录内
 *
 * @param {string} root - 允许的根目录（绝对路径）
 * @param {string} userPath - 用户提供的路径（相对或绝对）
 * @param {Object} options - 选项
 * @param {boolean} options.allowAbsolute - 是否允许绝对路径（默认 false）
 * @returns {string} 验证后的绝对路径
 * @throws {Error} 如果路径越界或包含恶意模式
 *
 * @example
 * // 安全的相对路径
 * validatePath("/workspace", "templates/file.txt")
 * // => "/workspace/templates/file.txt"
 *
 * @example
 * // 阻止路径遍历
 * validatePath("/workspace", "../../../etc/passwd")
 * // => 抛出错误: "路径越界: ../../../etc/passwd"
 *
 * @example
 * // 阻止绝对路径
 * validatePath("/workspace", "/etc/passwd")
 * // => 抛出错误: "不允许使用绝对路径: /etc/passwd"
 */
export function validatePath(root, userPath, options = {}) {
    // 1. 输入验证
    if (typeof userPath !== "string" || !userPath.trim()) {
        throw new Error("路径不能为空");
    }

    // 2. 检查恶意字符（空字节注入）
    if (userPath.includes("\0")) {
        throw new Error(`路径包含非法字符: ${userPath}`);
    }

    // 3. 绝对路径处理
    if (path.isAbsolute(userPath)) {
        if (!options.allowAbsolute) {
            throw new Error(`不允许使用绝对路径: ${userPath}`);
        }
        // 即使允许绝对路径，也必须在根目录内
        const relative = path.relative(root, userPath);
        if (relative.startsWith("..") || path.isAbsolute(relative)) {
            throw new Error(`绝对路径越界: ${userPath}`);
        }
        assertRealPathWithinRoot(root, userPath, userPath);
        return userPath;
    }

    // 4. 解析相对路径
    const resolved = path.resolve(root, userPath);

    // 5. 边界检查：确保解析后的路径仍在根目录内
    const relative = path.relative(root, resolved);

    // 检查是否包含 ".." 或变成绝对路径（说明逃出了根目录）
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
        throw new Error(`路径越界: ${userPath}`);
    }

    // 6. 真实路径检查：junction/符号链接在词法层不可见，按真实位置再判一次
    assertRealPathWithinRoot(root, resolved, userPath);

    return resolved;
}

/**
 * 批量验证多个路径
 *
 * @param {string} root - 允许的根目录
 * @param {string[]} paths - 用户提供的路径数组
 * @param {Object} options - 验证选项
 * @returns {string[]} 验证后的绝对路径数组
 * @throws {Error} 如果任何路径无效
 */
export function validatePaths(root, paths, options = {}) {
    return paths.map((p) => validatePath(root, p, options));
}

/**
 * 检查路径是否在根目录内（不抛出错误）
 *
 * @param {string} root - 允许的根目录
 * @param {string} userPath - 用户提供的路径
 * @returns {boolean} 如果路径安全返回 true
 */
export function isPathSafe(root, userPath) {
    try {
        validatePath(root, userPath);
        return true;
    } catch {
        return false;
    }
}

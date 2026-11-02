// 用户级项目登记：把已接入 scenario-test 的项目与固定端口记录在用户目录，
// 供 serve / start 脚本复用，也供 agent-app-manager 发现项目时读取同一份配置。
//
// 设计要点：
//   - 数据目录默认 ~/.scenario-test/，可用 SCENARIO_TEST_HOME 覆盖（测试与隔离验证用）。
//   - 以 scenario.config.js 的规范化绝对路径为键；Windows 下大小写不敏感。
//   - 端口一经登记即固定复用；只有显式 --port、projects set-port 或 --reassign 才会改变。
//   - 写入采用临时文件 + rename，读改写期间持有短锁，避免 serve 与外部管理器并发覆盖。
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

export const REGISTRY_SCHEMA_VERSION = 1;
export const DEFAULT_PORT = 4300;
export const DEFAULT_SCENARIO_DIR = "scenario-test";
export const HOME_ENV = "SCENARIO_TEST_HOME";

const REGISTRY_FILE = "projects.json";
const LOCK_FILE = "projects.lock";
const LOCK_RETRY_MS = 50;
const LOCK_TIMEOUT_MS = 5000;
const LOCK_STALE_MS = 15000;
const MAX_PORT_PROBES = 200;

export function resolveRegistryHome(env = process.env) {
    const explicit = env[HOME_ENV];
    return explicit ? path.resolve(explicit) : path.join(os.homedir(), ".scenario-test");
}

export function registryPath(home = resolveRegistryHome()) {
    return path.join(home, REGISTRY_FILE);
}

function isDirectory(target) {
    try {
        return fs.statSync(target).isDirectory();
    } catch {
        return false;
    }
}

export function canonicalPath(target) {
    let resolved = path.resolve(target);
    try {
        resolved = fs.realpathSync.native(resolved);
    } catch {
        // 配置尚未落盘时 realpath 会失败；保持 resolve 结果即可
    }
    return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function nowIso() {
    return new Date().toISOString();
}

function emptyRegistry() {
    return {
        schemaVersion: REGISTRY_SCHEMA_VERSION,
        defaultPort: DEFAULT_PORT,
        projects: {}
    };
}

export function readRegistry(home = resolveRegistryHome()) {
    const file = registryPath(home);
    let raw;
    try {
        raw = fs.readFileSync(file, "utf8");
    } catch (error) {
        if (error?.code === "ENOENT") return emptyRegistry();
        throw error;
    }
    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new Error(`项目登记文件不是合法 JSON：${file}`);
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error(`项目登记文件结构无效：${file}`);
    }
    const registry = emptyRegistry();
    if (Number.isInteger(parsed.defaultPort) && parsed.defaultPort >= 1 && parsed.defaultPort <= 65535) {
        registry.defaultPort = parsed.defaultPort;
    }
    if (parsed.projects && typeof parsed.projects === "object" && !Array.isArray(parsed.projects)) {
        for (const [key, value] of Object.entries(parsed.projects)) {
            if (!value || typeof value !== "object" || Array.isArray(value)) continue;
            if (typeof value.config !== "string" || typeof value.port !== "number") continue;
            registry.projects[key] = {
                name: typeof value.name === "string" ? value.name : path.basename(path.dirname(value.config)),
                slug: typeof value.slug === "string" ? value.slug : "",
                root: typeof value.root === "string" ? value.root : path.dirname(value.config),
                dir: typeof value.dir === "string" ? value.dir : path.dirname(value.config),
                config: value.config,
                port: value.port,
                createdAt: typeof value.createdAt === "string" ? value.createdAt : nowIso(),
                updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : nowIso()
            };
        }
    }
    return registry;
}

function writeRegistry(registry, home = resolveRegistryHome()) {
    fs.mkdirSync(home, { recursive: true });
    const file = registryPath(home);
    const temp = `${file}.${process.pid}.${crypto.randomBytes(4).toString("hex")}.tmp`;
    fs.writeFileSync(temp, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
    fs.renameSync(temp, file);
}

function sleepSync(ms) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// 登记文件锁：CLI 与外部管理器（agent-app-manager）可能同时登记同一项目。
// 锁只覆盖读改写与端口探测，持有时长通常为毫秒级。
async function withRegistryLock(home, action) {
    fs.mkdirSync(home, { recursive: true });
    const lock = path.join(home, LOCK_FILE);
    const deadline = Date.now() + LOCK_TIMEOUT_MS;
    let handle;
    while (!handle) {
        try {
            handle = fs.openSync(lock, "wx");
            fs.writeFileSync(handle, JSON.stringify({ pid: process.pid, at: Date.now() }));
        } catch (error) {
            if (error?.code !== "EEXIST") throw error;
            try {
                const stat = fs.statSync(lock);
                if (Date.now() - stat.mtimeMs > LOCK_STALE_MS) {
                    fs.rmSync(lock, { force: true });
                    continue;
                }
            } catch {
                continue;
            }
            if (Date.now() > deadline) {
                throw new Error(`项目登记锁等待超时：${lock}`);
            }
            await sleep(LOCK_RETRY_MS);
        }
    }
    try {
        return await action();
    } finally {
        try {
            fs.closeSync(handle);
        } catch {
            // 已关闭时忽略
        }
        fs.rmSync(lock, { force: true });
    }
}

// 同步版本仅供非 async 场景（projects list/remove 等）使用；serve/ensure 走 async 版本。
function withRegistryLockSync(home, action) {
    fs.mkdirSync(home, { recursive: true });
    const lock = path.join(home, LOCK_FILE);
    const deadline = Date.now() + LOCK_TIMEOUT_MS;
    let handle;
    while (!handle) {
        try {
            handle = fs.openSync(lock, "wx");
            fs.writeFileSync(handle, JSON.stringify({ pid: process.pid, at: Date.now() }));
        } catch (error) {
            if (error?.code !== "EEXIST") throw error;
            try {
                const stat = fs.statSync(lock);
                if (Date.now() - stat.mtimeMs > LOCK_STALE_MS) {
                    fs.rmSync(lock, { force: true });
                    continue;
                }
            } catch {
                continue;
            }
            if (Date.now() > deadline) {
                throw new Error(`项目登记锁等待超时：${lock}`);
            }
            sleepSync(LOCK_RETRY_MS);
        }
    }
    try {
        return action();
    } finally {
        try {
            fs.closeSync(handle);
        } catch {
            // 已关闭时忽略
        }
        fs.rmSync(lock, { force: true });
    }
}

function projectName(root) {
    const base = path.basename(path.resolve(root));
    return base && base !== path.parse(path.resolve(root)).root ? base : "project";
}

export function slugify(name) {
    const slug = String(name)
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-")
        .replace(/^[-._]+|[-._]+$/g, "");
    if (slug) return slug;
    const digest = crypto.createHash("sha1").update(String(name)).digest("hex").slice(0, 6);
    return `project-${digest}`;
}

function uniqueSlug(registry, name, key) {
    const base = slugify(name);
    const taken = new Set(
        Object.entries(registry.projects)
            .filter(([entryKey]) => entryKey !== key)
            .map(([, entry]) => entry.slug)
            .filter(Boolean)
    );
    if (!taken.has(base)) return base;
    const digest = crypto.createHash("sha1").update(key).digest("hex").slice(0, 6);
    return `${base}-${digest}`;
}

// 从当前目录向上寻找 scenario-test 接入目录：
//   1. 当前目录自身就是接入目录（含 scenario.config.js + .scenario-test/）
//   2. 当前目录下有 scenario-test/scenario.config.js
// 自定义目录名只要保留 .scenario-test/ 标记也能识别。
export function discoverProject(startDir = process.cwd()) {
    let current = path.resolve(startDir);
    while (true) {
        const directConfig = path.join(current, "scenario.config.js");
        if (fs.existsSync(directConfig) && isDirectory(path.join(current, ".scenario-test"))) {
            const root = path.dirname(current);
            return { root, dir: current, config: directConfig, name: projectName(root) };
        }
        const nestedDir = path.join(current, DEFAULT_SCENARIO_DIR);
        const nestedConfig = path.join(nestedDir, "scenario.config.js");
        if (fs.existsSync(nestedConfig)) {
            return { root: current, dir: nestedDir, config: nestedConfig, name: projectName(current) };
        }
        const parent = path.dirname(current);
        if (parent === current) return null;
        current = parent;
    }
}

export function projectFromConfig(configPath) {
    const config = path.resolve(configPath);
    const dir = path.dirname(config);
    return { root: path.dirname(dir), dir, config, name: projectName(path.dirname(dir)) };
}

export function projectKey(configPath) {
    return canonicalPath(configPath);
}

export function listProjects(home = resolveRegistryHome()) {
    const registry = readRegistry(home);
    return Object.entries(registry.projects)
        .map(([key, entry]) => ({ key, ...entry }))
        .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)));
}

function isPortFree(port, host = "127.0.0.1") {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once("error", () => resolve(false));
        server.listen(port, host, () => {
            server.close(() => resolve(true));
        });
    });
}

async function findFreePort(preferred, host = "127.0.0.1") {
    const start = Number.isInteger(preferred) && preferred >= 1 && preferred <= 65535 ? preferred : DEFAULT_PORT;
    for (let offset = 0; offset < MAX_PORT_PROBES; offset += 1) {
        const port = start + offset;
        if (port > 65535) break;
        if (await isPortFree(port, host)) return port;
    }
    throw new Error(`从端口 ${start} 起未找到空闲端口，请用 --port 指定端口`);
}

function normalizeEntry(registry, project, key) {
    const now = nowIso();
    const existing = registry.projects[key];
    if (existing) {
        let changed = false;
        if (existing.name !== project.name) {
            existing.name = project.name;
            changed = true;
        }
        if (existing.root !== project.root) {
            existing.root = project.root;
            changed = true;
        }
        if (existing.dir !== project.dir) {
            existing.dir = project.dir;
            changed = true;
        }
        if (existing.config !== project.config) {
            existing.config = project.config;
            changed = true;
        }
        if (!existing.slug) {
            existing.slug = uniqueSlug(registry, project.name, key);
            changed = true;
        }
        if (changed) existing.updatedAt = now;
        return { entry: existing, created: false, changed };
    }
    const entry = {
        name: project.name,
        slug: uniqueSlug(registry, project.name, key),
        root: project.root,
        dir: project.dir,
        config: project.config,
        port: null,
        createdAt: now,
        updatedAt: now
    };
    registry.projects[key] = entry;
    return { entry, created: true, changed: true };
}

// 登记项目并解析固定端口：
//   - explicitPort：用户显式 --port，直接写入登记（是否被占用交给 serve 报错）
//   - 已有登记且未要求 reassign：沿用登记端口
//   - 未登记 / 端口为空 / reassign 且端口被占用：从 defaultPort 起分配空闲端口
export async function ensureProject(project, options = {}) {
    const home = options.home || resolveRegistryHome();
    const explicitPort = options.port;
    const reassign = options.reassign === true;
    return withRegistryLock(home, async () => {
        const registry = readRegistry(home);
        const key = projectKey(project.config);
        const normalized = normalizeEntry(registry, project, key);
        const entry = normalized.entry;
        let changed = normalized.changed;
        if (Number.isInteger(explicitPort) && explicitPort >= 1 && explicitPort <= 65535) {
            if (entry.port !== explicitPort) {
                entry.port = explicitPort;
                entry.updatedAt = nowIso();
                changed = true;
            }
        } else if (!entry.port) {
            entry.port = await findFreePort(registry.defaultPort);
            entry.updatedAt = nowIso();
            changed = true;
        } else if (reassign && !(await isPortFree(entry.port))) {
            entry.port = await findFreePort(registry.defaultPort);
            entry.updatedAt = nowIso();
            changed = true;
        }
        if (changed) writeRegistry(registry, home);
        const portAvailable = await isPortFree(entry.port);
        return {
            key,
            entry: { ...entry },
            created: normalized.created,
            changed,
            portAvailable
        };
    });
}

export function setProjectPort(project, port, home = resolveRegistryHome()) {
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("端口必须是 1-65535 的整数");
    }
    return withRegistryLockSync(home, () => {
        const registry = readRegistry(home);
        const key = projectKey(project.config);
        const normalized = normalizeEntry(registry, project, key);
        normalized.entry.port = port;
        normalized.entry.updatedAt = nowIso();
        writeRegistry(registry, home);
        return { key, entry: { ...normalized.entry } };
    });
}

export function setDefaultPort(port, home = resolveRegistryHome()) {
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("默认端口必须是 1-65535 的整数");
    }
    return withRegistryLockSync(home, () => {
        const registry = readRegistry(home);
        registry.defaultPort = port;
        writeRegistry(registry, home);
        return registry.defaultPort;
    });
}

export function removeProject(project, home = resolveRegistryHome()) {
    return withRegistryLockSync(home, () => {
        const registry = readRegistry(home);
        const key = projectKey(project.config);
        const entry = registry.projects[key] ? { ...registry.projects[key] } : null;
        delete registry.projects[key];
        if (entry) writeRegistry(registry, home);
        return { key, removed: Boolean(entry), entry };
    });
}

export function findProjectByConfig(configPath, home = resolveRegistryHome()) {
    const registry = readRegistry(home);
    const key = projectKey(configPath);
    return registry.projects[key] ? { key, ...registry.projects[key] } : null;
}

export { isPortFree };

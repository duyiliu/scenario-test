import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
    createDistLifecycle,
    createDistPaths,
    isPidDead,
    RENAME_ATTEMPTS,
    RENAME_RETRY_DELAY_MS
} from "../scripts/build-dist.mjs";

function makeRoot(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-build-dist-"));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    return root;
}

function writeFile(file, content) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content, "utf8");
}

function makeDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

// fs 故障注入：只覆盖需要模拟的调用，其余透传真实实现
function fsWith(overrides) {
    return { ...fs, ...overrides };
}

function eperm() {
    const error = new Error("EPERM: operation not permitted, rename");
    error.code = "EPERM";
    return error;
}

test("isPidDead：只有 ESRCH 视为死亡，EPERM/存活均保守视为存活", () => {
    assert.equal(isPidDead(123, () => {}), false);
    assert.equal(isPidDead(123, () => { throw Object.assign(new Error("gone"), { code: "ESRCH" }); }), true);
    assert.equal(isPidDead(123, () => { throw Object.assign(new Error("denied"), { code: "EPERM" }); }), false);
    assert.equal(isPidDead(123, () => { throw new Error("unknown"); }), false);
});

test("rename 瞬时 EPERM：按 250ms 重试并在第 3 次成功，不触发 cpSync 回退", async (t) => {
    const root = makeRoot(t);
    const paths = createDistPaths(root, 999001);
    makeDir(paths.staging);
    writeFile(path.join(paths.staging, "new.txt"), "new");
    makeDir(paths.dist);
    writeFile(path.join(paths.dist, "old.txt"), "old");

    let stagingRenameAttempts = 0;
    let cpSyncCalls = 0;
    const sleeps = [];
    const lifecycle = createDistLifecycle({
        root,
        pid: paths.pid,
        sleep: async (ms) => { sleeps.push(ms); },
        fs: fsWith({
            renameSync(from, to) {
                if (from === paths.staging && to === paths.dist) {
                    stagingRenameAttempts += 1;
                    if (stagingRenameAttempts < 3) throw eperm();
                }
                return fs.renameSync(from, to);
            },
            cpSync(...args) {
                cpSyncCalls += 1;
                return fs.cpSync(...args);
            }
        })
    });

    const result = await lifecycle.publish();

    assert.equal(stagingRenameAttempts, 3);
    assert.deepEqual(sleeps, [RENAME_RETRY_DELAY_MS, RENAME_RETRY_DELAY_MS]);
    assert.equal(cpSyncCalls, 0);
    assert.equal(result.fallbackUsed, false);
    assert.equal(result.renameAttemptCount, 3);
    assert.equal(fs.readFileSync(path.join(paths.dist, "new.txt"), "utf8"), "new");
    assert.equal(fs.existsSync(paths.staging), false);
    assert.equal(fs.existsSync(paths.backup), false);
});

test("rename 持续 EPERM：重试 4 次后回退 cpSync 到 swap 再原子换入，旧产物备份最终清理", async (t) => {
    const root = makeRoot(t);
    const paths = createDistPaths(root, 999002);
    makeDir(paths.staging);
    writeFile(path.join(paths.staging, "nested/new.txt"), "new");
    makeDir(paths.dist);
    writeFile(path.join(paths.dist, "old.txt"), "old");

    let stagingRenameAttempts = 0;
    const sleeps = [];
    const cpSyncCalls = [];
    const lifecycle = createDistLifecycle({
        root,
        pid: paths.pid,
        sleep: async (ms) => { sleeps.push(ms); },
        fs: fsWith({
            renameSync(from, to) {
                if (from === paths.staging && to === paths.dist) {
                    stagingRenameAttempts += 1;
                    throw eperm();
                }
                return fs.renameSync(from, to);
            },
            cpSync(from, to, options) {
                cpSyncCalls.push({ from, to, options });
                return fs.cpSync(from, to, options);
            }
        })
    });

    const result = await lifecycle.publish();

    assert.equal(stagingRenameAttempts, RENAME_ATTEMPTS);
    assert.deepEqual(sleeps, Array(RENAME_ATTEMPTS - 1).fill(RENAME_RETRY_DELAY_MS));
    assert.equal(cpSyncCalls.length, 1);
    assert.equal(cpSyncCalls[0].from, paths.staging);
    assert.equal(cpSyncCalls[0].to, paths.swap);
    assert.deepEqual(cpSyncCalls[0].options, { recursive: true });
    assert.equal(result.fallbackUsed, true);
    assert.equal(fs.readFileSync(path.join(paths.dist, "nested/new.txt"), "utf8"), "new");
    assert.equal(fs.existsSync(paths.staging), false);
    assert.equal(fs.existsSync(paths.swap), false);
    assert.equal(fs.existsSync(paths.backup), false);
});

test("孤儿清理：死 pid 的 staging/swap/trash 删除，存活 pid（含 pid 复用）不误删", (t) => {
    const root = makeRoot(t);
    const dead = new Set([111, 222, 333]);
    const lifecycle = createDistLifecycle({
        root,
        pid: 999003,
        isPidDead: (pid) => dead.has(pid)
    });
    const names = [
        "dist.staging-111",
        "dist.swap-222",
        "dist.trash-333",
        "dist.staging-444",
        "dist.swap-555",
        "dist.trash-666",
        "dist.backup-777",
        "dist.restore-888",
        "dist.staging-not-a-pid"
    ];
    for (const name of names) writeFile(path.join(root, name, "keep.txt"), name);

    lifecycle.cleanupOrphans();

    for (const name of ["dist.staging-111", "dist.swap-222", "dist.trash-333"]) {
        assert.equal(fs.existsSync(path.join(root, name)), false, `${name} 应被清理`);
    }
    // 存活 pid 可能是并发构建；pid 被系统复用时同样按存活处理，宁可不删
    for (const name of ["dist.staging-444", "dist.swap-555", "dist.trash-666", "dist.backup-777", "dist.restore-888", "dist.staging-not-a-pid"]) {
        assert.equal(fs.existsSync(path.join(root, name, "keep.txt")), true, `${name} 不应被清理`);
    }
});

test("孤儿清理：backup 死 pid 且 dist 存在时移入 trash 后删除，不覆盖当前 dist", (t) => {
    const root = makeRoot(t);
    const paths = createDistPaths(root, 999004);
    const orphan = path.join(root, "dist.backup-123");
    makeDir(paths.dist);
    writeFile(path.join(paths.dist, "current.txt"), "current");
    writeFile(path.join(orphan, "old.txt"), "old");
    const lifecycle = createDistLifecycle({
        root,
        pid: paths.pid,
        isPidDead: (pid) => pid === 123
    });

    lifecycle.cleanupOrphans();

    assert.equal(fs.readFileSync(path.join(paths.dist, "current.txt"), "utf8"), "current");
    assert.equal(fs.existsSync(orphan), false);
    assert.equal(fs.existsSync(paths.trash), false);
});

test("孤儿清理：backup 死 pid、dist 缺失且无活跃构建时自动还原为 dist", (t) => {
    const root = makeRoot(t);
    const paths = createDistPaths(root, 999005);
    const orphan = path.join(root, "dist.backup-123");
    writeFile(path.join(orphan, "old.txt"), "old");
    const lifecycle = createDistLifecycle({
        root,
        pid: paths.pid,
        isPidDead: (pid) => pid === 123
    });

    lifecycle.cleanupOrphans();

    assert.equal(fs.readFileSync(path.join(paths.dist, "old.txt"), "utf8"), "old");
    assert.equal(fs.existsSync(orphan), false);
    assert.equal(fs.existsSync(paths.claimed), false);
});

test("孤儿清理：backup 死 pid、dist 缺失但仍有活跃 staging 构建时推迟还原", (t) => {
    const root = makeRoot(t);
    const paths = createDistPaths(root, 999006);
    const orphan = path.join(root, "dist.backup-123");
    writeFile(path.join(orphan, "old.txt"), "old");
    makeDir(path.join(root, "dist.staging-555"));
    const lifecycle = createDistLifecycle({
        root,
        pid: paths.pid,
        isPidDead: (pid) => pid === 123
    });

    lifecycle.cleanupOrphans();

    assert.equal(fs.existsSync(paths.dist), false);
    assert.equal(fs.readFileSync(path.join(orphan, "old.txt"), "utf8"), "old");
    assert.equal(fs.existsSync(path.join(root, "dist.staging-555")), true);
});

test("发布失败回滚：cpSync 失败时旧 dist 从 backup 还原且抛错", async (t) => {
    const root = makeRoot(t);
    const paths = createDistPaths(root, 999007);
    makeDir(paths.staging);
    writeFile(path.join(paths.staging, "new.txt"), "new");
    makeDir(paths.dist);
    writeFile(path.join(paths.dist, "old.txt"), "old");
    const lifecycle = createDistLifecycle({
        root,
        pid: paths.pid,
        sleep: async () => {},
        fs: fsWith({
            renameSync(from, to) {
                if (from === paths.staging && to === paths.dist) throw eperm();
                return fs.renameSync(from, to);
            },
            cpSync() {
                throw eperm();
            }
        })
    });

    await assert.rejects(() => lifecycle.publish(), /EPERM/);
    assert.equal(fs.readFileSync(path.join(paths.dist, "old.txt"), "utf8"), "old");
    assert.equal(fs.existsSync(paths.backup), false);
    assert.equal(fs.existsSync(paths.swap), false);
});

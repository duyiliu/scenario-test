// dist 发布/孤儿清理的可注入实现：build.mjs 只负责真正构建，目录交换与
// 崩溃残留清理集中在这里。Windows 瞬时目录锁（杀毒/索引器/编辑器）无法在
// 常规测试中稳定复现，因此本模块把 fs、sleep、pid 存活判断都做成依赖，
// tests/build.test.js 可注入 EPERM/ESRCH 做确定性故障测试。
import fsDefault from "node:fs";
import path from "node:path";

export const RENAME_ATTEMPTS = 4;
export const RENAME_RETRY_DELAY_MS = 250;

const ORPHAN_PATTERN = /^dist\.(staging|swap|backup|restore|trash)-(\d+)$/;
const STAGING_PATTERN = /^dist\.staging-(\d+)$/;

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 仅 ESRCH（No such process）能证明 pid 已死亡；EPERM 是「存在但无权限」
// （跨权限上下文的活跃构建），其余错误同样保守视为存活——宁可不删不误伤。
// kill 可注入，便于测试 ESRCH/EPERM 分支而不依赖真实进程状态。
export function isPidDead(pid, kill = process.kill.bind(process)) {
    try {
        kill(pid, 0);
        return false;
    } catch (error) {
        return error?.code === "ESRCH";
    }
}

export function createDistPaths(root, pid = process.pid) {
    return {
        root,
        pid,
        dist: path.join(root, "dist"),
        staging: path.join(root, `dist.staging-${pid}`),
        swap: path.join(root, `dist.swap-${pid}`),
        backup: path.join(root, `dist.backup-${pid}`),
        claimed: path.join(root, `dist.restore-${pid}`),
        trash: path.join(root, `dist.trash-${pid}`)
    };
}

// 并发安全不靠互斥锁而靠协议：dist 位置只会被原子 rename 换入完整产物，
// 本进程失败路径绝不向 dist 写入半成品——因此回滚时 dist 存在即视为
// 他人产物（不得删），启动还原仅在无活跃构建（无存活 staging pid）时进行
function hasLiveStagingBuild(root, fs, isPidDead) {
    for (const name of fs.readdirSync(root)) {
        const match = STAGING_PATTERN.exec(name);
        if (!match) continue;
        if (!isPidDead(Number(match[1]))) return true;
    }
    return false;
}

export function createDistLifecycle({
    root,
    pid = process.pid,
    fs = fsDefault,
    isPidDead: pidIsDead = (targetPid) => isPidDead(targetPid),
    sleep = defaultSleep,
    renameAttempts = RENAME_ATTEMPTS,
    retryDelayMs = RENAME_RETRY_DELAY_MS
} = {}) {
    if (typeof root !== "string" || !root) throw new TypeError("createDistLifecycle 需要 root 目录");
    const paths = createDistPaths(root, pid);
    const hasLiveBuild = () => hasLiveStagingBuild(root, fs, pidIsDead);

    // 清理上次构建中断遗留的 staging/swap/backup/trash/restore 目录：目录名带构建
    // 进程 pid，仅当该 pid 已不存活才处理（pid 复用时宁可不动），避免误伤并发构建。
    // backup/restore 是「可能唯一完整的旧产物」：删除与还原都必须先经原子 rename
    // 认领进本进程独占命名空间——直接 rmSync 递归删除中途失败会留下残缺目录，
    // 残缺源被自动还原为 dist 会产生丢产物的成品；trash-* 只删不还原，
    // restore-* 是认领成功后的完整副本，按 backup 同口径处理
    function cleanupOrphans() {
        for (const name of fs.readdirSync(root)) {
            const match = ORPHAN_PATTERN.exec(name);
            if (!match) continue;
            if (!pidIsDead(Number(match[2]))) continue;
            const orphan = path.join(root, name);
            const kind = match[1];
            if (kind === "backup" || kind === "restore") {
                // 认领：rename 是原子操作，成功即独占源目录（另一进程同时认领会失败跳过）
                try { fs.renameSync(orphan, paths.claimed); } catch { continue; }
                if (fs.existsSync(paths.dist)) {
                    // dist 已就位：认领到的旧产物冗余——移出可恢复命名空间再删，
                    // 删除中断留下的 trash-* 下轮只会继续清理、不会被还原
                    try {
                        fs.renameSync(paths.claimed, paths.trash);
                        fs.rmSync(paths.trash, { recursive: true, force: true });
                    } catch { /* 残留 trash 无碍 */ }
                } else if (hasLiveBuild()) {
                    // 其他构建正处发布窗口：还原命名空间，等它落定后再处理
                    try { fs.renameSync(paths.claimed, orphan); } catch { /* 留在 restore-* 下轮再处理 */ }
                } else {
                    try {
                        fs.renameSync(paths.claimed, paths.dist);
                    } catch {
                        // 就位失败（如另一发布者抢先占位）：dist 已出现则认领内容冗余——
                        // 仍须先转 trash 命名空间再删，直接删 restore-* 会留下残缺的
                        // 可恢复源；dist 仍缺失则还原原命名空间保留恢复能力
                        try {
                            if (fs.existsSync(paths.dist)) {
                                fs.renameSync(paths.claimed, paths.trash);
                                fs.rmSync(paths.trash, { recursive: true, force: true });
                            } else {
                                fs.renameSync(paths.claimed, orphan);
                            }
                        } catch { /* 保留完整 claimed 供下次恢复 */ }
                    }
                }
            } else {
                fs.rmSync(orphan, { recursive: true, force: true });
            }
        }
    }

    // 构建全部成功后才替换 dist。Windows 无目录原子交换，发布分两段：
    //   1) 旧 dist 先 rename 为 dist.backup-<pid>（不是删除——rename 失败则全程未动，
    //      比直接 rm 再 rename 少一个「dist 已删、rename 仍失败」的丢产物窗口）；
    //   2) staging rename 就位（250ms 间隔重试抗瞬时锁），持续失败回退 cp 到
    //      dist.swap-<pid> 再换入——直接 cp 进 dist 会让读者看到逐文件半成品。
    // 任一步失败回滚：backup rename 回 dist——旧产物全程可还原，不存在 dist 缺失终态；
    // backup rename 本身失败则中止抛错（旧 dist 原封未动，比旧路径强）。
    async function publish() {
        const hadDist = fs.existsSync(paths.dist);
        // 清理同名残留（pid 复用留下的旧 backup/swap）：dist 缺失时同名 backup 可能是
        // 唯一旧版恢复候选——此时不清它（发布失败/中断后要能还原），仅当 dist 存在
        // （马上被覆盖进同名 backup）才先转 trash 命名空间再删，删除中断的残留不进还原
        if (hadDist) {
            try {
                fs.renameSync(paths.backup, paths.trash);
                fs.rmSync(paths.trash, { recursive: true, force: true });
            } catch { /* backup 不存在或占用：继续，后续 dist→backup rename 会明确失败 */ }
        }
        fs.rmSync(paths.swap, { recursive: true, force: true });
        let distMoved = false;
        let swapped = false;
        let renameAttemptCount = 0;
        try {
            if (hadDist) {
                fs.renameSync(paths.dist, paths.backup);
                distMoved = true;
            }
            for (let attempt = 0; attempt < renameAttempts && !swapped; attempt += 1) {
                renameAttemptCount += 1;
                try {
                    fs.renameSync(paths.staging, paths.dist);
                    swapped = true;
                } catch {
                    if (attempt < renameAttempts - 1) await sleep(retryDelayMs);
                }
            }
            if (!swapped) {
                fs.cpSync(paths.staging, paths.swap, { recursive: true });
                fs.renameSync(paths.swap, paths.dist);
            }
        } catch (error) {
            // 回滚：本进程的失败路径不可能在 dist 位置留下半成品（新产物只经原子
            // rename 就位，cp 只落到 swap）——因此 dist 存在即视为他人完整产物
            // （旧的或并发构建刚发布的），绝不删除；缺失时才还原 backup。
            // 每步清理独立容错，不得阻断还原与抛错
            try { fs.rmSync(paths.swap, { recursive: true, force: true }); } catch { /* 残留无碍 */ }
            if (distMoved) {
                if (fs.existsSync(paths.dist)) {
                    error.message += `；dist 已被其他构建发布接管，旧产物备份保留在 ${paths.backup} 供人工核对`;
                } else {
                    try {
                        fs.renameSync(paths.backup, paths.dist);
                    } catch (restoreError) {
                        // 还原失败：明示 backup 路径供手动恢复（下次构建启动清理遇到
                        // dist 缺失 + 死 pid + 无活跃构建的 backup 时会自动还原）
                        error.message += `；旧产物备份保留在 ${paths.backup}（自动还原失败: ${restoreError.message}），可手动 rename 回 dist`;
                    }
                }
            }
            throw error;
        }
        // 就位后的清理失败不影响发布结果：staging/backup 孤儿目录由下次构建按 pid 存活
        // 检测清理；backup 先移入 trash 命名空间再递归删——删除中断的残留只会继续被清理，
        // 不会被误当成完整备份还原
        try { fs.rmSync(paths.staging, { recursive: true, force: true }); } catch { /* 残留无碍 */ }
        // backup 存在即冗余（新产物已就位，无论它是本次 distMoved 产物还是同名残留），
        // 一律先转 trash 命名空间再删
        try {
            if (fs.existsSync(paths.backup)) {
                fs.renameSync(paths.backup, paths.trash);
                fs.rmSync(paths.trash, { recursive: true, force: true });
            }
        } catch { /* 残留无碍 */ }
        return { hadDist, fallbackUsed: !swapped, renameAttemptCount };
    }

    return { paths, cleanupOrphans, publish };
}

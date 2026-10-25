// 覆盖率阈值参数（Node.js 22.8+）的版本门槛。
export function supportsCoverageThresholds(version) {
    const [major, minor] = version.split(".").map(Number);
    return major > 22 || (major === 22 && minor >= 8);
}

// 覆盖率运行结果判定（纯函数，供 check-coverage 与单测复用）。
// 关键约束：测试失败必须优先于“阈值不足”的预期失败，避免覆盖率门禁掩盖真实测试失败。
export function evaluateCoverageRun({ status, output }) {
    if (status === 0) {
        return { ok: false, message: "覆盖率命令预期因阈值不足失败，但实际通过；请复核阈值或覆盖率基线" };
    }

    const failures = output.match(/^# fail (\d+)$/m);
    if (!failures) {
        return { ok: false, message: "未找到测试汇总；无法确认覆盖率运行中没有测试失败" };
    }
    if (Number(failures[1]) !== 0) {
        return { ok: false, message: `覆盖率运行中有 ${failures[1]} 个测试失败，不能按阈值不足处理` };
    }

    const cancelled = output.match(/^# cancelled (\d+)$/m);
    if (cancelled && Number(cancelled[1]) !== 0) {
        return { ok: false, message: `覆盖率运行中有 ${cancelled[1]} 个测试被取消` };
    }

    const threshold = output.match(/Error: [\d.]+% (line|branch) coverage does not meet threshold of \d+%\./);
    if (!threshold) {
        return { ok: false, message: "覆盖率命令非零退出，但不是因为配置的覆盖率阈值不足" };
    }

    const start = output.indexOf("# start of coverage report");
    const end = output.indexOf("# end of coverage report", start);
    if (start < 0 || end <= start) {
        return { ok: false, message: "未找到覆盖率报告区间" };
    }

    const report = output.slice(start, end);
    if (!/^# src\s/m.test(report)) {
        return { ok: false, message: "覆盖率报告未包含 src/" };
    }
    const leaked = report.match(/^# (?:dist|tests|scripts)(?:\s|$)/m);
    if (leaked) {
        return { ok: false, message: `覆盖率报告混入非 src 目录：${leaked[0]}` };
    }

    return { ok: true, threshold: threshold[0], testFailures: 0 };
}

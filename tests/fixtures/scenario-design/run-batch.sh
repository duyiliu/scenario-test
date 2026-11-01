#!/usr/bin/env bash
# 批量跑多轮 A/B：同一份夹具与 prompt，按 tag 前缀连续产出，供 summarize.mjs 汇总。
#
# 用法：
#   # 基线（需 SKILL_DIR 指向旧版本 skill）
#   SKILL_DIR=/root/skill-baseline/skills/scenario-test bash run-batch.sh baseline 2 6
#
#   # 当前版本
#   PI_IMAGE=scenario-test-pi:1.4.0-node22 bash run-batch.sh current 2 6
set -euo pipefail

GROUP="${1:?用法: run-batch.sh <baseline|current> <起始轮次> <结束轮次>}"
FROM="${2:-1}"
TO="${3:-6}"
HERE="$(cd "$(dirname "$0")" && pwd)"

for i in $(seq "$FROM" "$TO"); do
  echo "=== ${GROUP}-${i} $(date '+%H:%M:%S') ==="
  # 单轮失败（模型截断、超时）不应中断整组：保留已成功的轮次，失败记为数据点。
  if ! bash "$HERE/run-ab.sh" --tag "${GROUP}-${i}" 2>&1 | tail -4; then
    echo "  ${GROUP}-${i} 失败，继续下一轮"
  fi
done

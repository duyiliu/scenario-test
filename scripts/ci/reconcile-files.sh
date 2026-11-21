#!/usr/bin/env bash
# PR 文件清单对账。
#
# GitHub REST「List pull request files」最多返回 3000 条，--paginate 也不会更多。
# 如果返回条数与 PR 自身报告的 changedFiles 不一致，说明清单被截断：
# 清单里可能只有安全文件，而真正的危险改动在截断之外。此时必须 fail-closed。
#
# 用法：reconcile-files.sh <listed_count> <changed_files>
# 输出：单行 reconcile=ok 或 reconcile=mismatch ...
# 退出码：0 判定完成（结论在 stdout）；2 参数错误。
set -u

max=3000

if [ "$#" -ne 2 ]; then
  echo "usage: reconcile-files.sh <listed_count> <changed_files>" >&2
  exit 2
fi

listed=$1
changed=$2

is_uint() {
  case "$1" in
    ''|*[!0-9]*) return 1 ;;
    *) return 0 ;;
  esac
}

if ! is_uint "$listed"; then
  echo "reconcile=mismatch reason=bad-listed listed=$listed max=$max"
  exit 0
fi

if ! is_uint "$changed"; then
  echo "reconcile=mismatch reason=bad-changed expected=$changed max=$max"
  exit 0
fi

if [ "$changed" -gt "$max" ] || [ "$listed" -gt "$max" ]; then
  echo "reconcile=mismatch reason=truncated expected=$changed listed=$listed max=$max"
  exit 0
fi

if [ "$changed" -le 0 ] || [ "$listed" -le 0 ]; then
  echo "reconcile=mismatch reason=empty expected=$changed listed=$listed max=$max"
  exit 0
fi

if [ "$listed" -ne "$changed" ]; then
  echo "reconcile=mismatch reason=count-differs expected=$changed listed=$listed max=$max"
  exit 0
fi

echo "reconcile=ok"

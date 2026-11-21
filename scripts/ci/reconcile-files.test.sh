#!/usr/bin/env bash
# reconcile-files.sh 的确定性用例。
# 目的：证明清单条数与 PR 的 changedFiles 不一致时一定 fail-closed，
# 尤其是 GitHub 的 3000 条上限（含 3000/3001 的合成演示）。
set -u

here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
script="$here/reconcile-files.sh"

total=0
failed=0

run_case() {
  local name=$1 expected=$2 listed=$3 changed=$4
  local output rc
  total=$((total + 1))
  output=$(bash "$script" "$listed" "$changed")
  rc=$?
  printf 'CASE %s\n' "$name"
  printf '  listed:  %s\n' "$listed"
  printf '  changed: %s\n' "$changed"
  printf '  output:  %s\n' "$output"
  printf '  exit:    %d\n' "$rc"
  if [ "$rc" -eq 0 ] && [[ "$output" == "$expected"* ]]; then
    printf '  result:  PASS\n'
  else
    printf '  result:  FAIL (expected prefix: %s)\n' "$expected"
    failed=$((failed + 1))
  fi
}

run_case "完整清单"                   "reconcile=ok"                       12      12
run_case "清单少一条"                 "reconcile=mismatch"                 11      12
run_case "3000 上限：截断后少一条"    "reconcile=mismatch reason=truncated" 3000 3001
run_case "3001/3001 仍在截断区"       "reconcile=mismatch reason=truncated" 3001 3001
run_case "空 PR"                      "reconcile=mismatch reason=empty"     0       0
run_case "非数字输入"                 "reconcile=mismatch reason=bad-listed" abc     3

printf '\nSUMMARY %d/%d passed, %d failed\n' "$((total - failed))" "$total" "$failed"
[ "$failed" -eq 0 ]

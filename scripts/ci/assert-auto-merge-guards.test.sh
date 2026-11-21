#!/usr/bin/env bash
# assert-auto-merge-guards.sh 的正反用例：真实文件必须通过，4 类变异必须失败。
set -u

here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
guard="$here/assert-auto-merge-guards.sh"
real="$(cd "$here/../.." && pwd)/.github/workflows/auto-merge.yml"

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

total=0
failed=0

run_case() {
  local name=$1 expected=$2 file=$3
  local output rc
  total=$((total + 1))
  output=$(bash "$guard" "$file" 2>&1)
  rc=$?
  printf 'CASE %s\n' "$name"
  printf '  exit:    %d\n' "$rc"
  printf '  output:  %s\n' "$(printf '%s' "$output" | tail -n 2 | tr '\n' ' ')"
  if [ "$rc" -eq "$expected" ]; then
    printf '  result:  PASS\n'
  else
    printf '  result:  FAIL (expected exit %d)\n' "$expected"
    failed=$((failed + 1))
  fi
}

run_case "真实 workflow" 0 "$real"

sed 's/^  pull_request_target:/  pull_request:/' "$real" > "$work/top-level-pr.yml"
run_case "变异：顶层 pull_request" 1 "$work/top-level-pr.yml"

sed 's#github.event.pull_request.base.sha#github.event.pull_request.head.ref#' "$real" > "$work/head-ref.yml"
run_case "变异：checkout head.ref" 1 "$work/head-ref.yml"

{ cat "$real"; echo '          # --auto'; } > "$work/auto.yml"
run_case "变异：--auto" 1 "$work/auto.yml"

{ cat "$real"; echo '      - uses: actions/checkout@v4'; } > "$work/two-checkouts.yml"
run_case "变异：多一个 checkout" 1 "$work/two-checkouts.yml"

sed 's/^  checks: read/  checks: write/' "$real" > "$work/checks-write.yml"
run_case "变异：checks write" 1 "$work/checks-write.yml"

printf '\nSUMMARY %d/%d passed, %d failed\n' "$((total - failed))" "$total" "$failed"
[ "$failed" -eq 0 ]

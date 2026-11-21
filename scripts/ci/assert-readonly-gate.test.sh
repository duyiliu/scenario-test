#!/usr/bin/env bash
# assert-readonly-gate.sh 的正反用例：真文件必须通过，注入写能力必须失败。
set -u

here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
guard="$here/assert-readonly-gate.sh"
gate="$(cd "$here/../.." && pwd)/.github/workflows/merge-gate.yml"

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

cp "$gate" "$work/good.yml"
run_case "当前 merge-gate.yml" 0 "$work/good.yml"

sed 's/^  contents: read$/  contents: write/' "$gate" > "$work/write-perm.yml"
run_case "注入 contents 写权限" 1 "$work/write-perm.yml"

cp "$gate" "$work/merge-cmd.yml"
printf '        run: gh pr merge 1 --squash\n' >> "$work/merge-cmd.yml"
run_case "注入合并命令" 1 "$work/merge-cmd.yml"

cp "$gate" "$work/admin.yml"
printf '        run: gh api --admin\n' >> "$work/admin.yml"
run_case "注入 admin 绕过" 1 "$work/admin.yml"

cp "$gate" "$work/target.yml"
printf '  pull_request_target:\n' >> "$work/target.yml"
run_case "改为 target 事件" 1 "$work/target.yml"

cp "$gate" "$work/token.yml"
printf '          GH_TOKEN: ${{ secrets.RELEASE_TOKEN }}\n' >> "$work/token.yml"
run_case "引入外部凭据" 1 "$work/token.yml"

printf '\nSUMMARY %d/%d passed, %d failed\n' "$((total - failed))" "$total" "$failed"
[ "$failed" -eq 0 ]

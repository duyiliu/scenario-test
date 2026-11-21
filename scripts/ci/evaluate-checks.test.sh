#!/usr/bin/env bash
# evaluate-checks.sh 的确定性用例：H2（来源绑定）与 M4（同名冲突）。
set -u

here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
script="$here/evaluate-checks.sh"
fixtures="$here/fixtures/checks"

total=0
failed=0

run_case() {
  local name=$1 expected=$2 fixture=$3
  shift 3
  local output rc verdict
  total=$((total + 1))
  output=$(bash "$script" "$@" < "$fixtures/$fixture")
  rc=$?
  verdict=$(printf '%s\n' "$output" | sed -n 's/^verdict\t//p')
  printf 'CASE %s\n' "$name"
  printf '  fixture: %s\n' "$fixture"
  printf '  verdict: %s\n' "$verdict"
  printf '  detail:  %s\n' "$(printf '%s' "$output" | tr '\t' ' ' | tr '\n' ';')"
  printf '  exit:    %d\n' "$rc"
  if [ "$rc" -eq 0 ] && [ "$verdict" = "$expected" ]; then
    printf '  result:  PASS\n'
  else
    printf '  result:  FAIL (expected verdict %s)\n' "$expected"
    failed=$((failed + 1))
  fi
}

run_case "两项全部成功"                 ok      "all-success.tsv"        "unit (ubuntu-24.04, node 22)" "d.ts 类型自检"
run_case "一项缺失"                     pending "missing-one.tsv"        "unit (ubuntu-24.04, node 22)" "d.ts 类型自检"
run_case "一项仍在跑"                   pending "in-progress.tsv"        "unit (ubuntu-24.04, node 22)" "d.ts 类型自检"
run_case "同名一成功一失败"             pending "duplicate-conflict.tsv" "unit (ubuntu-24.04, node 22)" "d.ts 类型自检"
run_case "同名两条都成功"               ok      "duplicate-both-ok.tsv"  "unit (ubuntu-24.04, node 22)" "d.ts 类型自检"
run_case "同名检查来自别的 App"         pending "wrong-app.tsv"          "unit (ubuntu-24.04, node 22)" "d.ts 类型自检"
run_case "同名检查来自别的 workflow"    pending "wrong-workflow.tsv"     "unit (ubuntu-24.04, node 22)" "d.ts 类型自检"

printf '\nSUMMARY %d/%d passed, %d failed\n' "$((total - failed))" "$total" "$failed"
[ "$failed" -eq 0 ]

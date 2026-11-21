#!/usr/bin/env bash
# classify-risk.sh 的确定性用例：每个夹具是一份改动文件清单。
# 输出每个用例的输入、真实输出、真实退出码与 PASS/FAIL，最后返回汇总退出码。
set -u

here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
classifier="$here/classify-risk.sh"
fixtures="$here/fixtures"

total=0
failed=0

run_case() {
  local name=$1
  local expected=$2
  local fixture=$3
  local output
  local rc

  total=$((total + 1))
  output=$("$classifier" < "$fixtures/$fixture")
  rc=$?

  printf 'CASE %s\n' "$name"
  printf '  fixture: %s\n' "$fixture"
  printf '  input:   %s\n' "$(tr '\n' ' ' < "$fixtures/$fixture")"
  printf '  output:  %s\n' "$output"
  printf '  exit:    %d\n' "$rc"

  if [ "$rc" -eq 0 ] && [ "$output" = "low_risk=$expected" ]; then
    printf '  result:  PASS\n'
  else
    printf '  result:  FAIL (expected low_risk=%s)\n' "$expected"
    failed=$((failed + 1))
  fi
}

run_case "纯 docs 改动"            true  "docs-only.txt"
run_case "根目录 README.md"        true  "root-readme.txt"
run_case "根目录 AGENTS.md"        false "agents-md.txt"
run_case "子目录 AGENTS.md"        false "nested-agents-md.txt"
run_case ".github/ 下改动"         false "github-dir.txt"
run_case "src/ 代码改动"           false "src-change.txt"
run_case "混合改动"                false "mixed.txt"
run_case "docs + README + 深路径 md" true "docs-and-readme.txt"
run_case "空文件列表"              false "empty.txt"

printf '\nSUMMARY %d/%d passed, %d failed\n' "$((total - failed))" "$total" "$failed"
[ "$failed" -eq 0 ]

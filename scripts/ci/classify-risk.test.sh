#!/usr/bin/env bash
# classify-risk.sh 的确定性用例：每个夹具是一份改动文件清单。
# 输出每个用例的输入、真实输出、真实退出码与 PASS/FAIL，最后返回汇总退出码。
set -u

here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
classifier="$here/classify-risk.sh"
fixtures="$here/fixtures"

total=0
failed=0

report() {
  local name=$1 input=$2 output=$3 rc=$4 expected=$5
  printf 'CASE %s\n' "$name"
  printf '  input:   %s\n' "$input"
  printf '  output:  %s\n' "$output"
  printf '  exit:    %d\n' "$rc"
  if [ "$rc" -eq 0 ] && [ "$output" = "low_risk=$expected" ]; then
    printf '  result:  PASS\n'
  else
    printf '  result:  FAIL (expected low_risk=%s)\n' "$expected"
    failed=$((failed + 1))
  fi
}

run_case() {
  local name=$1 expected=$2 fixture=$3
  local output rc
  total=$((total + 1))
  output=$("$classifier" < "$fixtures/$fixture")
  rc=$?
  printf '  fixture: %s\n' "$fixture"
  report "$name" "$(tr '\n' ' ' < "$fixtures/$fixture")" "$output" "$rc" "$expected"
}

# 空清单没有夹具文件：0 字节文件在某些检出下会被记为 i/none，反而干扰行尾审计。
run_empty_case() {
  local output rc
  total=$((total + 1))
  output=$("$classifier" < /dev/null)
  rc=$?
  report "空文件列表" "(empty stdin)" "$output" "$rc" false
}

run_case "纯 docs 改动"              true  "docs-only.txt"
run_case "docs 单文件 a.md"          true  "docs-a-md.txt"
run_case "docs 深层目录 md"          true  "deep-docs-md.txt"
run_case "根目录 README.md"          true  "root-readme.txt"
run_case "docs + 根 README"          true  "docs-and-readme.txt"
run_case "根目录 AGENTS.md"          false "agents-md.txt"
run_case "根目录 CLAUDE.md"          false "root-claude-md.txt"
run_case "子目录 AGENTS.md"          false "nested-agents-md.txt"
run_case "docs/AGENTS.md"            false "docs-agents-md.txt"
run_case "docs/CLAUDE.md"            false "docs-claude-md.txt"
run_case "docs 深层 AGENTS.md"       false "docs-sub-agents-md.txt"
run_case "skills/x.md（bot 指令）"   false "skills-md.txt"
run_case "tests/readme.md"           false "tests-md.txt"
run_case "src/notes.md"              false "src-md.txt"
run_case ".github/x.md"              false "github-md.txt"
run_case "docs 下的非 Markdown"      false "docs-non-md.txt"
run_case "examples 下的 Markdown"    false "examples-md.txt"
run_case "src/ 代码改动"             false "src-change.txt"
run_case "改名进 docs（旧路径 src）" false "renamed-into-docs.txt"
run_case "混合改动"                  false "mixed.txt"
run_empty_case

printf '\nSUMMARY %d/%d passed, %d failed\n' "$((total - failed))" "$total" "$failed"
[ "$failed" -eq 0 ]

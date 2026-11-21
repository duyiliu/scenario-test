#!/usr/bin/env bash
# evaluate-tree.sh 的确定性用例：普通文件、可执行文件、symlink、gitlink、树截断、缺失、删除。
set -u

here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
script="$here/evaluate-tree.sh"
fixtures="$here/fixtures/tree"

total=0
failed=0

run_case() {
  local name=$1 expected=$2 truncated=$3 changed=$4 tree=$5
  local output verdict rc
  total=$((total + 1))
  output=$(bash "$script" "$truncated" "$fixtures/$changed" "$fixtures/$tree")
  rc=$?
  verdict=$(printf '%s\n' "$output" | sed -n 's/^verdict\t//p')
  printf 'CASE %s\n' "$name"
  printf '  fixture: %s + %s（truncated=%s）\n' "$changed" "$tree" "$truncated"
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

run_case "docs 普通文件 100644"      ok     false normal.changed.tsv  normal.tree.tsv
run_case "根 md 普通文件"            ok     false root.changed.tsv    root.tree.tsv
run_case "可执行文件 100755"         ok     false exec.changed.tsv    exec.tree.tsv
run_case "docs symlink 120000"       reject false symlink.changed.tsv symlink.tree.tsv
run_case "docs gitlink 160000"       reject false gitlink.changed.tsv gitlink.tree.tsv
run_case "tree truncated"            reject true  normal.changed.tsv  normal.tree.tsv
run_case "清单路径不在 tree"          reject false missing.changed.tsv missing.tree.tsv
run_case "删除文档（不在 head tree）" ok     false removed.changed.tsv removed.tree.tsv
run_case "未知 mode 100600"           reject false badmode.changed.tsv badmode.tree.tsv

printf '\nSUMMARY %d/%d passed, %d failed\n' "$((total - failed))" "$total" "$failed"
[ "$failed" -eq 0 ]

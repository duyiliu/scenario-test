#!/usr/bin/env bash
# 校验 head tree 中被改动的文档都是普通文件（100644 / 100755）。
#
# 为什么需要：classify-risk.sh 只看路径。docs/x.md 若是 symlink（120000）或 gitlink（160000），
# 路径仍然匹配 docs/*.md，但它不是普通文档；自动合并前必须用 tree API 的 mode 再判一次。
#
# 用法：evaluate-tree.sh <truncated:true|false> <changed-status.tsv> <tree.tsv>
#   changed-status.tsv: status<TAB>path
#   tree.tsv:           path<TAB>mode
# 输出：每条问题一行 not-ok<TAB>path<TAB>原因，最后 verdict<TAB>ok|reject
# 退出码：0 判定完成；2 参数/文件缺失（同时输出 reject）。
set -u

if [ "$#" -ne 3 ]; then
  echo "usage: evaluate-tree.sh <truncated> <changed-status.tsv> <tree.tsv>" >&2
  printf 'verdict\treject\n'
  exit 2
fi

truncated=$1
changed_file=$2
tree_file=$3

issues=0
not_ok() {
  printf 'not-ok\t%s\t%s\n' "$1" "$2"
  issues=$((issues + 1))
}

if [ ! -f "$changed_file" ]; then
  not_ok "-" "changed-file-missing"
fi
if [ ! -f "$tree_file" ]; then
  not_ok "-" "tree-file-missing"
fi

if [ "$truncated" != "false" ]; then
  not_ok "-" "tree-truncated"
fi

entries=0
if [ -f "$changed_file" ] && [ -f "$tree_file" ]; then
  while IFS=$'\t' read -r status path; do
    [ -n "$path" ] || continue
    entries=$((entries + 1))
    [ "$status" = "removed" ] && continue

    mode=$(awk -F'\t' -v p="$path" '$1 == p { print $2; exit }' "$tree_file")
    if [ -z "$mode" ]; then
      not_ok "$path" "missing-from-tree"
      continue
    fi
    case "$mode" in
      100644|100755) ;;
      120000) not_ok "$path" "symlink" ;;
      160000) not_ok "$path" "gitlink" ;;
      *) not_ok "$path" "mode=$mode" ;;
    esac
  done < "$changed_file"
fi

if [ "$entries" -eq 0 ] && [ "$issues" -eq 0 ]; then
  not_ok "-" "empty-changes"
fi

if [ "$issues" -eq 0 ]; then
  printf 'verdict\tok\n'
else
  printf 'verdict\treject\n'
fi

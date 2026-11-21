#!/usr/bin/env bash
# 判定必需检查是否满足。纯函数：不访问网络，输入全部来自 stdin，便于确定性测试。
#
# 用法：evaluate-checks.sh <check-name> [<check-name> ...]
# 输入：TSV，每行一条 check-run：
#   name <TAB> status <TAB> conclusion <TAB> app.slug <TAB> workflow.path
#
# 规则（H2 / M4）：
#   - 同名检查可能有多条：全部都必须 completed/success，任一条待定或失败即不满足；
#   - app.slug 必须是 github-actions：别的 App 造同名 check-run 不算；
#   - workflow.path 必须是 .github/workflows/ci.yml：别的 workflow 造同名 job 不算；
#   - 找不到该名字即 absent。
# 输出：每行 "not-ok<TAB>name<TAB>原因"，最后一行 "verdict<TAB>ok" 或 "verdict<TAB>pending"。
set -u

required=("$@")
if [ "${#required[@]}" -eq 0 ]; then
  echo "usage: evaluate-checks.sh <check-name> [<check-name> ...]" >&2
  exit 2
fi

rows=$(cat)
issues=0

for name in "${required[@]}"; do
  matched=$(printf '%s\n' "$rows" | awk -F'\t' -v n="$name" 'NF && $1 == n')
  if [ -z "$matched" ]; then
    printf 'not-ok\t%s\tabsent\n' "$name"
    issues=$((issues + 1))
    continue
  fi

  bad=""
  while IFS=$'\t' read -r cname cstatus cconclusion cslug cpath; do
    [ -n "$cname" ] || continue
    if [ "$cslug" != "github-actions" ]; then
      bad="${bad} source=${cslug}"
      continue
    fi
    if [ "$cstatus" != "completed" ] || [ "$cconclusion" != "success" ]; then
      bad="${bad} ${cstatus}/${cconclusion}"
      continue
    fi
    if [ "$cpath" != ".github/workflows/ci.yml" ]; then
      bad="${bad} workflow=${cpath}"
    fi
  done <<< "$matched"

  if [ -n "$bad" ]; then
    printf 'not-ok\t%s\t%s\n' "$name" "$(printf '%s' "$bad" | sed 's/^ //')"
    issues=$((issues + 1))
  fi
done

if [ "$issues" -eq 0 ]; then
  printf 'verdict\tok\n'
else
  printf 'verdict\tpending\n'
fi

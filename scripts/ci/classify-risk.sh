#!/usr/bin/env bash
# 低风险判定，供 merge-gate workflow 与本地测试共用。
#
# 输入：文件路径列表。有参数时使用参数；否则逐行读取 stdin。
# 输出：单行 low_risk=true 或 low_risk=false。
# 退出码：0 判定完成；非 0 仅表示脚本自身无法运行。
#
# 规则：
#   low_risk=true 当且仅当所有文件匹配 ^docs/ 或 \.md$，
#   且没有任何文件匹配 (^|/)AGENTS\.md$ 或 ^\.github/。
# 空列表按 false 处理（无法确认改动范围时不合）。
set -u

files=()
if [ "$#" -gt 0 ]; then
  files=("$@")
else
  while IFS= read -r line || [ -n "$line" ]; do
    line=${line%$'\r'}
    [ -z "$line" ] && continue
    files+=("$line")
  done
fi

if [ "${#files[@]}" -eq 0 ]; then
  echo "low_risk=false"
  exit 0
fi

for file in "${files[@]}"; do
  if [[ "$file" == .github/* ]]; then
    echo "low_risk=false"
    exit 0
  fi
  if [[ "$file" == AGENTS.md || "$file" == */AGENTS.md ]]; then
    echo "low_risk=false"
    exit 0
  fi
  if [[ "$file" == docs/* || "$file" == *.md ]]; then
    continue
  fi
  echo "low_risk=false"
  exit 0
done

echo "low_risk=true"

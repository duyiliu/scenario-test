#!/usr/bin/env bash
# 低风险判定，供 merge-gate workflow 与本地测试共用。
#
# 输入：文件路径列表。有参数时使用参数；否则逐行读取 stdin。
# 输出：单行 low_risk=true 或 low_risk=false。
# 退出码：0 判定完成；非 0 仅表示脚本自身无法运行。
#
# 规则（宁可漏放，不可错放）：
#   low_risk=true 当且仅当每个文件都是 Markdown，且满足其一：
#     - docs/ 下任意深度（docs/**/*.md）；
#     - 仓库根目录的 *.md（不含子目录）。
#   例外：根目录的 AGENTS.md / CLAUDE.md 是 agent 指令，不算文档。
#   其余一律 false，特别是 skills/**、tests/**、examples/**、src/** 下的 Markdown
#   （它们是指令、评测输入或契约的一部分），以及 .github/**、docs/ 下的非 Markdown 文件。
#   空列表按 false 处理（无法确认改动范围时不合）。
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
  case "$file" in
    docs/*.md)
      continue
      ;;
  esac

  if [[ "$file" == *.md && "$file" != */* ]]; then
    case "$file" in
      AGENTS.md|CLAUDE.md)
        echo "low_risk=false"
        exit 0
        ;;
    esac
    continue
  fi

  echo "low_risk=false"
  exit 0
done

echo "low_risk=true"

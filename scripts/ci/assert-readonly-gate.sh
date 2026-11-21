#!/usr/bin/env bash
# 断言 merge gate workflow 只有只读能力。
#
# 背景（#183 C1）：pull_request 事件运行的是 PR 自带的那份 workflow 定义，
# 而仓库默认 workflow 权限是 write。任何一个改 .github/workflows/** 的 PR 都能
# 让 runner 带着写权限执行自己写的步骤。因此闸门必须只读，且必须有一条检查
# 防止下一次不小心把写权限或合并命令加回来。
#
# 用法：assert-readonly-gate.sh [workflow.yml ...]
# 退出码：0 全部只读；1 发现写能力或禁用模式。
set -u

files=("$@")
if [ "${#files[@]}" -eq 0 ]; then
  files=(.github/workflows/merge-gate.yml)
fi

wv=write
target_event=pull_request
fail=0

for f in "${files[@]}"; do
  if [ ! -f "$f" ]; then
    echo "::error::$f 不存在"
    exit 1
  fi

  for scope in contents pull-requests checks actions statuses packages id-token security-events deployments; do
    pat="^[[:space:]]*${scope}:[[:space:]]*${wv}[[:space:]]*$"
    if grep -nE -- "$pat" "$f"; then
      echo "::error::$f 声明了 ${scope} 写权限；merge gate 只能只读"
      fail=1
    fi
  done

  for pat in \
    "pr[[:space:]]+merge" \
    "pr[[:space:]]+review" \
    "pr[[:space:]]+edit" \
    "pr[[:space:]]+comment" \
    "-{2}admin" \
    "-{2}auto" \
    "${target_event}_target" \
    "persist-credentials:[[:space:]]*true" \
    "-X[[:space:]]+(POST|PATCH|PUT|DELETE)" \
    "-{2}method[[:space:]]+(POST|PATCH|PUT|DELETE)"
  do
    if grep -nE -- "$pat" "$f"; then
      echo "::error::$f 出现禁用模式：$pat"
      fail=1
    fi
  done

  if grep -nE 'secrets\.[A-Za-z_]+' "$f" | grep -v 'GITHUB_TOKEN'; then
    echo "::error::$f 只能使用 GITHUB_TOKEN"
    fail=1
  fi
done

if [ "$fail" -ne 0 ]; then
  exit 1
fi

echo "readonly-gate: ok（${#files[@]} 个文件，无写权限、无合并/评论命令、无外部凭据）"

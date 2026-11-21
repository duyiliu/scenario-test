#!/usr/bin/env bash
# 断言 auto-merge workflow 保持可信上下文的最小能力集。
#
# 这是防回归断言，不是安全边界：真正的边界是 pull_request_target 只运行 base 分支定义，
# 以及本 workflow 绝不 checkout / 执行 PR 内容。
#
# 用法：assert-auto-merge-guards.sh [workflow.yml ...]
# 退出码：0 全部通过；1 发现违规。
set -u

files=("$@")
if [ "${#files[@]}" -eq 0 ]; then
  files=(.github/workflows/auto-merge.yml)
fi

fail=0
err() {
  echo "::error::$*"
  fail=1
}

for f in "${files[@]}"; do
  if [ ! -f "$f" ]; then
    echo "::error::$f 不存在"
    exit 1
  fi

  # 1) 只允许 pull_request_target
  if grep -nE '^[[:space:]]*pull_request:' "$f"; then
    err "$f 出现顶层 pull_request:（必须是 pull_request_target）"
  fi
  grep -qE '^[[:space:]]*pull_request_target:' "$f" || err "$f 缺少 pull_request_target"

  # 2) 唯一 checkout，且只取 base.sha
  checkouts=$(grep -cE 'uses:[[:space:]]*actions/checkout@' "$f" || true)
  [ "$checkouts" -eq 1 ] || err "$f 的 actions/checkout 数量是 $checkouts（必须恰好 1 个）"
  grep -qE 'ref:[[:space:]]*\$\{\{[[:space:]]*github\.event\.pull_request\.base\.sha[[:space:]]*\}\}' "$f" \
    || err "$f 的 checkout ref 必须来自 base.sha"
  grep -qE 'persist-credentials:[[:space:]]*false' "$f" || err "$f 缺少 persist-credentials: false"
  if grep -nE 'persist-credentials:[[:space:]]*true' "$f"; then
    err "$f 出现 persist-credentials: true"
  fi

  # 3) 禁止 head.ref，ref 不得指向 PR head
  if grep -nE 'pull_request\.head\.ref' "$f"; then
    err "$f 出现 pull_request.head.ref"
  fi
  if grep -nE '^[[:space:]]*ref:.*pull_request\.head' "$f"; then
    err "$f 的 ref 指向 PR head"
  fi

  # 4) 合并命令必须绑定 head SHA，且不得使用自动合并开关
  grep -qE 'gh[[:space:]]+pr[[:space:]]+merge[^#]*--match-head-commit' "$f" \
    || err "$f 的 gh pr merge 缺少 --match-head-commit"
  if grep -n -- '--auto' "$f"; then
    err "$f 出现 --auto"
  fi

  # 5) 写权限只允许 contents / pull-requests；checks 与 actions 必须 read
  grep -qE '^[[:space:]]*contents:[[:space:]]*write' "$f" || err "$f 缺少 contents: write"
  grep -qE '^[[:space:]]*pull-requests:[[:space:]]*write' "$f" || err "$f 缺少 pull-requests: write"
  for scope in checks actions; do
    grep -qE "^[[:space:]]*${scope}:[[:space:]]*read" "$f" || err "$f 的 $scope 必须是 read"
  done
  for scope in \
    checks actions statuses packages id-token security-events deployments issues \
    discussions pages repository-projects
  do
    if grep -nE "^[[:space:]]*${scope}:[[:space:]]*write" "$f"; then
      err "$f 出现不允许的写权限：$scope"
    fi
  done

  # 6) N2：run 内容不得执行外部/下载来的代码
  run_scan=$(awk '
    /^[[:space:]]*run:[[:space:]]*\|[[:space:]]*$/ { inrun = 1; next }
    inrun && /^[[:space:]]*$/ { print ""; next }
    inrun {
      if ($0 ~ /^[[:space:]]+/) { print; next }
      inrun = 0
    }
  ' "$f")

  if printf '%s\n' "$run_scan" | grep -nE '(curl|wget)[^|]*\|[[:space:]]*(bash|sh)([[:space:]]|$)'; then
    err "$f 的 run 出现 curl/wget 管道到 shell"
  fi
  if printf '%s\n' "$run_scan" | grep -nE '(^|[^[:alnum:]_])eval([^[:alnum:]_]|$)'; then
    err "$f 的 run 出现 eval"
  fi
  if printf '%s\n' "$run_scan" | grep -nE 'git[[:space:]]+(clone|fetch|submodule)'; then
    err "$f 的 run 出现 git clone/fetch/submodule"
  fi
  if printf '%s\n' "$run_scan" | grep -nE '(npm[[:space:]]+(install|ci)|(^|[^[:alnum:]_])npx([^[:alnum:]_]|$))'; then
    err "$f 的 run 出现 npm install/ci 或 npx"
  fi

  # 7) N3：补齐 head 引用模式
  if grep -nE 'github\.head_ref' "$f"; then
    err "$f 出现 github.head_ref"
  fi
  if grep -nE 'refs/pull/' "$f"; then
    err "$f 出现 refs/pull/"
  fi
  if grep -nE '^[[:space:]]*ref:.*pull_request\.head\.sha' "$f"; then
    err "$f 的 ref 指向 pull_request.head.sha"
  fi
done

if [ "$fail" -ne 0 ]; then
  exit 1
fi

echo "auto-merge-guards: ok（${#files[@]} 个文件：pull_request_target + base checkout + 最小写权限 + head SHA 绑定）"

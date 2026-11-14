#!/usr/bin/env bash
# 对 current-1..6 各产物逐个跑 M1-M9 变异（单变异分批 + 批间 git checkout）。
# 为什么在 214 上要单变异跑：该机无 swap，mutation-check 连续注入多个变异时
# spawnSync(mvn)+java 服务叠加峰值会触发 OOM 杀死 Node（表现为 find 命中 0 /
# 进程直接消失），单变异分批可规避。输出 "变异 | 杀死/存活/执行失败" 行。
set -u
FIXTURE="tests/fixtures/scenario-design/order-adjust"
ART="tests/fixtures/scenario-design/artifacts"
cd "$(git rev-parse --show-toplevel)"

for n in 1 2 3 4 5 6; do
  echo "##### current-$n #####"
  for grp in M1 M2 M3 M4 M5 M6 M7 M8 M9; do
    git checkout -- "$FIXTURE" 2>/dev/null
    sleep 2
    out="$(node tests/fixtures/scenario-design/mutation-check.mjs \
      --artifact "$ART/current-$n/scenario-test" --only "$grp" 2>/dev/null)"
    # 提取每个变异的 killed/存活/执行失败
    printf '%s\n' "$out" | grep -E "杀死|存活|执行失败" | sed 's/^ *//' >/dev/null
    # 逐变异行：从 "[Mx-...]" 行取 id，下一行取结果
    printf '%s\n' "$out" | awk '
      /^\[M[0-9]/ { id=$1; gsub(/[\[\]]/,"",id) }
      /杀死|存活|执行失败/ {
        r=$0; gsub(/^ +| +$/,"",r);
        if (id!="") { print id" | "r; id="" }
      }'
  done
done
echo "ALLDONE"

#!/usr/bin/env bash
# 混合项目 + 已有自管 e2e（挂载语义）：init 不得混入模板，serve 面板只读挂载。
#
# 与 run-web-static-test.sh 的区别：项目自带 e2e/（前端团队自管 Playwright）。
# 预期：
#   - init --e2e 输出"检测到已有自管 e2e"提示或自动转挂载，不写 e2e/package.json 等模板；
#   - e2e/ 内文件 sha256 与夹具一致（无 marker 注入、无 reporter 改写）；
#   - HTTP 场景（scenarios/）与浏览器 E2E 可共存，serve 同时挂两种面板。
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
SKILL_DIR="${SKILL_DIR:-$ROOT/../../skills/scenario-test}"
PI_CONFIG_DIR="${PI_CONFIG_DIR:-$HOME/.pi/agent}"
MODEL="${MODEL:-deepseek-v4.1-flash}"
PI_IMAGE="${PI_IMAGE:-pi-agent-e2e:1.4.0-node22}"
PORT="${PORT:-18083}"
WORK="$(mktemp -d)"
cp -r "$ROOT/web-existing" "$WORK/demo-web"

# 挂载语义守卫：记录夹具 e2e 目录指纹，agent 结束后比对（只读不变式）
FINGERPRINT_BEFORE="$(cd "$WORK/demo-web" && find e2e -type f -not -path '*/node_modules/*' -exec sha256sum {} \; | sort | sha256sum)"

cleanup() {
  docker rm -f skill-e2e-webx-api >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

docker image inspect "$PI_IMAGE" >/dev/null 2>&1 ||
  docker build -t "$PI_IMAGE" -f "$HERE/../docker/Dockerfile.pi-e2e" "$HERE/../docker"

docker rm -f skill-e2e-webx-api >/dev/null 2>&1 || true
docker run -d --name skill-e2e-webx-api --network host \
  -v "$WORK/demo-web:/app" -w /app python:3.12-slim python app.py "$PORT" >/dev/null

for _ in $(seq 1 30); do
  curl -sf "http://127.0.0.1:$PORT/" >/dev/null 2>&1 && break
  sleep 1
done

set +e
docker run --rm --network host \
  -v "$SKILL_DIR:/skill:ro" \
  -v "$WORK:/work" \
  -v "$PI_CONFIG_DIR:/root/.pi/agent" \
  -v "$HERE/web-existing-agent.sh:/agent.sh:ro" \
  -e MODEL="$MODEL" \
  -e TARGET_PORT="$PORT" \
  -w /work/demo-web \
  "$PI_IMAGE" bash /agent.sh
AGENT_EXIT=$?
set -e

FINGERPRINT_AFTER="$(cd "$WORK/demo-web" && find e2e -type f -not -path '*/node_modules/*' -exec sha256sum {} \; | sort | sha256sum)"
echo
echo "== 挂载不变式 =="
if [ "$FINGERPRINT_BEFORE" = "$FINGERPRINT_AFTER" ]; then
  echo "PASS: 前端自管 e2e/ 目录未被修改（sha256 一致）"
else
  echo "FAIL: 前端自管 e2e/ 目录被修改！"
  (cd "$WORK/demo-web" && find e2e -type f -not -path '*/node_modules/*' | sort)
  exit 1
fi

echo "== 产物 =="
find "$WORK/demo-web/scenario-test" -maxdepth 2 -not -path '*/node_modules/*' 2>/dev/null | sort
echo "agent 退出码: $AGENT_EXIT（非 0 时检查上方输出）"
exit $AGENT_EXIT

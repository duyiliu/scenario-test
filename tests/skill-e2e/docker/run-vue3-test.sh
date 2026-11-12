#!/usr/bin/env bash
# 工程化前端项目（Vue3 + Vite）：真实 SPA 形态的 E2E 验证。
#
# 与 run-web-static-test.sh 的区别：
#   - 前后端双进程：python API（API_PORT，默认 18084）+ vite dev server（PORT，默认 18085，/api 代理到 API）；
#   - 容器内需 npm install（devDependencies 全量）；
#   - 复用带 Playwright 的 pi-agent-e2e 镜像。
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
SKILL_DIR="${SKILL_DIR:-$ROOT/../../skills/scenario-test}"
PI_CONFIG_DIR="${PI_CONFIG_DIR:-$HOME/.pi/agent}"
MODEL="${MODEL:-deepseek-v4.1-flash}"
PI_IMAGE="${PI_IMAGE:-pi-agent-e2e:1.4.0-node22}"
PORT="${PORT:-18085}"
API_PORT="${API_PORT:-18084}"
WORK="$(mktemp -d)"
cp -r "$ROOT/web-vue3" "$WORK/demo-web"

cleanup() {
  docker rm -f skill-e2e-vue3-api >/dev/null 2>&1 || true
  docker rm -f skill-e2e-vue3-web >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

docker image inspect "$PI_IMAGE" >/dev/null 2>&1 ||
  docker build -t "$PI_IMAGE" -f "$HERE/../docker/Dockerfile.pi-e2e" "$HERE/../docker"

# 后端 API 与前端 dev server 分开两个容器，--network host 下经 vite 代理互通
docker rm -f skill-e2e-vue3-api skill-e2e-vue3-web >/dev/null 2>&1 || true
docker run -d --name skill-e2e-vue3-api --network host \
  -v "$WORK/demo-web/server:/app" -w /app python:3.12-slim python app.py "$API_PORT" >/dev/null

docker run -d --name skill-e2e-vue3-web --network host \
  -v "$WORK/demo-web:/app" -w /app node:22-bookworm bash -c "npm install --no-audit --no-fund >/dev/null 2>&1 && npm run dev -- --host 127.0.0.1" >/dev/null

for _ in $(seq 1 60); do
  curl -sf "http://127.0.0.1:$PORT/" >/dev/null 2>&1 && break
  sleep 2
done
curl -sf "http://127.0.0.1:$PORT/" >/dev/null || { echo "vite dev server 未就绪" >&2; exit 1; }

docker run --rm --network host \
  -v "$SKILL_DIR:/skill:ro" \
  -v "$WORK:/work" \
  -v "$PI_CONFIG_DIR:/root/.pi/agent" \
  -v "$HERE/vue3-agent.sh:/agent.sh:ro" \
  -e MODEL="$MODEL" \
  -e TARGET_PORT="$PORT" \
  -e API_PORT="$API_PORT" \
  -w /work/demo-web \
  "$PI_IMAGE" bash /agent.sh

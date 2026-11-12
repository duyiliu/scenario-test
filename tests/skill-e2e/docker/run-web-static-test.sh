#!/usr/bin/env bash
# 纯前端项目（画像 e2e）：验证 init --e2e 托管链路与 E2E 场景生成执行。
#
# 用法：
#   bash tests/skill-e2e/docker/run-web-static-test.sh
#   PI_IMAGE=scenario-test-pi-e2e:1.4.0-node22 bash tests/skill-e2e/docker/run-web-static-test.sh
#   MODEL=new-api/deepseek-v4.1-flash bash tests/skill-e2e/docker/run-web-static-test.sh
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
SKILL_DIR="${SKILL_DIR:-$ROOT/../../skills/scenario-test}"
PI_CONFIG_DIR="${PI_CONFIG_DIR:-$HOME/.pi/agent}"
MODEL="${MODEL:-deepseek-v4.1-flash}"
PI_IMAGE="${PI_IMAGE:-pi-agent-e2e:1.4.0-node22}"
PORT="${PORT:-18082}"
WORK="$(mktemp -d)"
cp -r "$ROOT/web-static" "$WORK/demo-web"

cleanup() {
  docker rm -f skill-e2e-web-api >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

docker image inspect "$PI_IMAGE" >/dev/null 2>&1 ||
  docker build -t "$PI_IMAGE" -f "$HERE/../docker/Dockerfile.pi-e2e" "$HERE/../docker"

docker rm -f skill-e2e-web-api >/dev/null 2>&1 || true
docker run -d --name skill-e2e-web-api --network host \
  -v "$WORK/demo-web:/app" -w /app python:3.12-slim python app.py "$PORT" >/dev/null

for _ in $(seq 1 30); do
  curl -sf "http://127.0.0.1:$PORT/" >/dev/null 2>&1 && break
  sleep 1
done

docker run --rm --network host \
  -v "$SKILL_DIR:/skill:ro" \
  -v "$WORK:/work" \
  -v "$PI_CONFIG_DIR:/root/.pi/agent" \
  -v "$HERE/web-agent.sh:/agent.sh:ro" \
  -e MODEL="$MODEL" \
  -e TARGET_PORT="$PORT" \
  -w /work/demo-web \
  "$PI_IMAGE" bash /agent.sh

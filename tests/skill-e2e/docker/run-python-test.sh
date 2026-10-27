#!/usr/bin/env bash
# 干净 Docker 环境验证 scenario-test skill：Python 只读查询接口。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILL_DIR="${SKILL_DIR:-$ROOT/../../skills/scenario-test}"
PI_CONFIG_DIR="${PI_CONFIG_DIR:-$HOME/.pi/agent}"
WORK="$(mktemp -d)"
cp -r "$ROOT/python" "$WORK/demo-python"

cleanup() {
  docker rm -f skill-e2e-py-api >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

docker image inspect pi-agent:1.4.0 >/dev/null 2>&1 ||
  docker build -t pi-agent:1.4.0 -f "$ROOT/docker/Dockerfile.pi" "$ROOT/docker"

docker rm -f skill-e2e-py-api >/dev/null 2>&1 || true
docker run -d --name skill-e2e-py-api --network host \
  -v "$WORK/demo-python:/app" -w /app python:3.12-slim python app.py >/dev/null

for _ in $(seq 1 30); do
  curl -sf http://127.0.0.1:18081/api/health >/dev/null 2>&1 && break
  sleep 1
done

docker run --rm --network host \
  -v "$SKILL_DIR:/skill:ro" \
  -v "$WORK:/work" \
  -v "$PI_CONFIG_DIR:/root/.pi/agent" \
  -v "$ROOT/docker/python-agent.sh:/agent.sh:ro" \
  -w /work/demo-python \
  pi-agent:1.4.0 bash /agent.sh

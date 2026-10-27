#!/usr/bin/env bash
# 干净 Docker 环境验证 scenario-test skill：Spring Boot 鉴权 + 订单链路。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILL_DIR="${SKILL_DIR:-$ROOT/../../skills/scenario-test}"
PI_CONFIG_DIR="${PI_CONFIG_DIR:-$HOME/.pi/agent}"
WORK="$(mktemp -d)"
cp -r "$ROOT/java-springboot" "$WORK/demo-java"

cleanup() {
  docker rm -f skill-e2e-java-api >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

docker image inspect pi-agent:1.4.0 >/dev/null 2>&1 ||
  docker build -t pi-agent:1.4.0 -f "$ROOT/docker/Dockerfile.pi" "$ROOT/docker"

docker run --rm -v "$WORK/demo-java:/app" -w /app \
  maven:3.9-eclipse-temurin-17 mvn -q -DskipTests package

docker rm -f skill-e2e-java-api >/dev/null 2>&1 || true
docker run -d --name skill-e2e-java-api --network host \
  -v "$WORK/demo-java:/app" -w /app \
  maven:3.9-eclipse-temurin-17 java -jar target/demo-api-1.0.0.jar >/dev/null

for _ in $(seq 1 60); do
  curl -sf -X POST http://127.0.0.1:18080/api/login \
    -H 'Content-Type: application/json' \
    -d '{"username":"demo","password":"demo123"}' >/dev/null 2>&1 && break
  sleep 1
done

docker run --rm --network host \
  -v "$SKILL_DIR:/skill:ro" \
  -v "$WORK:/work" \
  -v "$PI_CONFIG_DIR:/root/.pi/agent" \
  -v "$ROOT/docker/java-agent.sh:/agent.sh:ro" \
  -w /work/demo-java \
  pi-agent:1.4.0 bash /agent.sh

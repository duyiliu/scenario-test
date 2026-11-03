#!/usr/bin/env bash
# 场景设计质量 A/B：同一份 order-adjust 项目、同一 prompt，跑一次 skill 后自动评分。
#
# 用法：
#   # 当前工作区的 skill
#   bash run-ab.sh --tag current-1
#
#   # 对比某个已发布的旧版本 skill（先 git worktree / git clone 拿到那个 tag）
#   SKILL_DIR=/path/to/old/skills/scenario-test bash run-ab.sh --tag baseline-1
#
#   # 复用已有 pi 镜像（214 上是 scenario-test-pi:1.4.0-node22）
#   PI_IMAGE=scenario-test-pi:1.4.0-node22 bash run-ab.sh --tag current-1
#
#   # 同名模型在多个 provider 下存在时，MODEL 要写成 provider/model
#   MODEL=new-api/deepseek-v4.1-flash bash run-ab.sh --tag current-2
#
#   # 证据隐藏变体：docs/API.md 不再直接给出错误码，必须自己查 ErrorCode 枚举
#   EVIDENCE_MODE=hidden bash run-ab.sh --tag current-hidden-1
#
# 产物保存在 artifacts/<tag>/，评分结果打印到 stdout，JSON 在同目录 report.json，
# agent 完整输出在 agent.log。
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../../.." && pwd)"
SKILL_DIR="${SKILL_DIR:-$REPO/skills/scenario-test}"
PI_CONFIG_DIR="${PI_CONFIG_DIR:-$HOME/.pi/agent}"
MODEL="${MODEL:-deepseek-v4.1-flash}"
# 214 上已有预建镜像 scenario-test-pi:1.4.0-node22，可直接复用，不必重新 build。
PI_IMAGE="${PI_IMAGE:-pi-agent:1.4.0}"
EVIDENCE_MODE="${EVIDENCE_MODE:-full}"
TAG=""
ARTIFACT_ROOT="${ARTIFACT_ROOT:-$HERE/artifacts}"

while [ $# -gt 0 ]; do
  case "$1" in
    --tag) TAG="$2"; shift 2 ;;
    --model) MODEL="$2"; shift 2 ;;
    --skill) SKILL_DIR="$2"; shift 2 ;;
    *) echo "未知参数: $1" >&2; exit 2 ;;
  esac
done
TAG="${TAG:-$(date +%Y%m%d-%H%M%S)}"

CLI="$REPO/dist/scenario-test-cli.cjs"
[ -f "$CLI" ] || { echo "缺少 $CLI，请先运行 npm run build" >&2; exit 2; }
[ -f "$SKILL_DIR/SKILL.md" ] || { echo "SKILL_DIR 无效: $SKILL_DIR" >&2; exit 2; }
docker info >/dev/null 2>&1 || { echo "Docker 不可用" >&2; exit 2; }

WORK="$(mktemp -d)"
OUT="$ARTIFACT_ROOT/$TAG"
mkdir -p "$OUT"

cleanup() { rm -rf "$WORK"; }
trap cleanup EXIT

# 1. 复制夹具项目（业务源码 + 预置弱场景），不复制 .scenario-test 运行时。
mkdir -p "$WORK/project"
cp -r "$HERE/order-adjust/." "$WORK/project/"

# 1b. 证据隐藏变体：删掉文档里可直接抄的错误码，逼 agent 自己检索统一异常契约。
case "$EVIDENCE_MODE" in
  full) ;;
  hidden) node "$HERE/hide-evidence.mjs" "$WORK/project" ;;
  *) echo "未知 EVIDENCE_MODE: $EVIDENCE_MODE（支持 full / hidden）" >&2; exit 2 ;;
esac

# 2. 非交互初始化：只补运行时文件，保留预置的 scenario.config.js 与场景。
node "$CLI" init --project "$WORK/project" --dir scenario-test --no-input >/dev/null

# 3. pi 容器里生成场景（只写不跑）。挂载 skill、工作区、模型凭据与 prompt。
# --entrypoint bash：不同 pi 镜像的 ENTRYPOINT 不一样（有的直接是 pi），统一绕过。
# --user root + HOME=/root：214 的镜像默认 USER 是 uid 10001 的 pi，读不到挂载的
#   /root/.pi/agent（700 root），pi 会报「没有任何可用模型」。
docker image inspect "$PI_IMAGE" >/dev/null 2>&1 ||
  docker build -t "$PI_IMAGE" -f "$REPO/tests/skill-e2e/docker/Dockerfile.pi" "$REPO/tests/skill-e2e/docker"

docker run --rm --entrypoint bash --user root \
  -e HOME=/root \
  -v "$SKILL_DIR:/skill:ro" \
  -v "$WORK:/work" \
  -v "$PI_CONFIG_DIR:/root/.pi/agent" \
  -v "$HERE/prompt.md:/prompt.md:ro" \
  -v "$HERE/agent.sh:/agent.sh:ro" \
  -e MODEL="$MODEL" \
  -w /work/project \
  "$PI_IMAGE" /agent.sh 2>&1 | tee "$OUT/agent.log"

# 4. 保存产出并评分。
cp -r "$WORK/project/scenario-test" "$OUT/scenario-test"
node "$HERE/score.mjs" --artifact "$OUT/scenario-test" | tee "$OUT/report.txt"
node "$HERE/score.mjs" --artifact "$OUT/scenario-test" --json > "$OUT/report.json"

echo
echo "产物: $OUT"
echo "对比多轮结果: node $HERE/summarize.mjs $ARTIFACT_ROOT"

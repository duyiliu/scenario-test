#!/usr/bin/env bash
#
# scenario-test 一键安装脚本（Linux/macOS）
#
# 使用方法：
#   ./install.sh
#   ./install.sh /path/to/project scenario-test
#   ./install.sh /path/to/project scenario-test "https://nexus.example.com/repository/scenario-test/v0.16.0"
#   curl -fsSL https://raw.githubusercontent.com/duyiliu/scenario-test/v0.16.0/scripts/install.sh | bash -s -- /path/to/project scenario-test
#
# 原理：免 npm 安装 —— 按固定版本从 GitHub Release 下载整包运行时
#       scenario-test-runtime-v<版本>.tar.gz 到用户级版本目录
#       ~/.scenario-test/runtime/<版本>/，业务项目只落场景数据（config/README/cmd），
#       不安装 npm 包、不改 package.json、项目内不留运行时副本。
#       SCENARIO_TEST_SOURCE 或第三个参数可改用内网制品目录（需含同名 tar.gz 与 .sha256）。
#

set -eo pipefail

LOG_DIR=$(mktemp -d "${TMPDIR:-/tmp}/scenario-test-install.XXXXXX")
trap 'rm -rf "$LOG_DIR"' EXIT

# 默认参数
PROJECT_DIR="${1:-.}"
TARGET_DIR="${2:-scenario-test}"
SOURCE="${3:-${SCENARIO_TEST_SOURCE:-}}"
SKIP_DOCTOR="${SKIP_DOCTOR:-false}"
SCENARIO_TEST_VERSION="${SCENARIO_TEST_VERSION:-0.16.0}"
ARCHIVE_NAME="scenario-test-runtime-v${SCENARIO_TEST_VERSION}.tar.gz"
DEFAULT_SOURCE="https://github.com/duyiliu/scenario-test/releases/download/v${SCENARIO_TEST_VERSION}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_info() { echo -e "${CYAN}ℹ${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_header() { echo -e "${MAGENTA}$1${NC}"; }

# 显示标题
echo ""
print_header "=== scenario-test 一键安装 ==="
print_header "模式: 免 npm 下载（GitHub Tag 固定版本）"
echo ""

# 1. 检查 Node.js 版本
print_info "检查 Node.js 版本..."
if ! command -v node &> /dev/null; then
    print_error "Node.js 未安装"
    print_info "请访问 https://nodejs.org/ 安装 Node.js 22+"
    exit 1
fi

NODE_VERSION=$(node -v)
NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/v\([0-9]*\).*/\1/')

if [ "$NODE_MAJOR" -lt 22 ]; then
    print_error "需要 Node.js 22+，当前版本：$NODE_VERSION"
    print_info "请访问 https://nodejs.org/ 下载最新 LTS 版本"
    exit 1
fi
print_success "Node.js 版本检查通过：$NODE_VERSION"

# 2. 检查项目目录并进入
print_info "项目目录：$PROJECT_DIR"
if [ ! -d "$PROJECT_DIR" ]; then
    print_error "项目目录不存在：$PROJECT_DIR"
    exit 1
fi

PROJECT_DIR=$(cd "$PROJECT_DIR" && pwd)
cd "$PROJECT_DIR"
print_success "项目目录：$PROJECT_DIR"

FULL_TARGET_PATH="$PROJECT_DIR/$TARGET_DIR"

# v24 起发布物是整包：下载 tar.gz → 校验 sidecar → 解压到版本目录。
# 同一份包也被 Skill 的 ensure-runtime.mjs 消费，两个入口落到同一个 <版本>/ 目录。
RUNTIME_ROOT="$HOME/.scenario-test/runtime"
RUNTIME_DIR="$RUNTIME_ROOT/$SCENARIO_TEST_VERSION"
mkdir -p "$RUNTIME_ROOT"
STAGE_DIR="$LOG_DIR/runtime"
mkdir -p "$STAGE_DIR"

DOWNLOAD_SOURCE="${SOURCE:-$DEFAULT_SOURCE}"
DOWNLOAD_SOURCE="$(echo "$DOWNLOAD_SOURCE" | sed 's:/*$::')"
ARCHIVE_URL="$DOWNLOAD_SOURCE/$ARCHIVE_NAME"
ARCHIVE_PATH="$LOG_DIR/$ARCHIVE_NAME"
print_info "下载运行时发布包：$ARCHIVE_URL ..."
if ! curl -fsSL "$ARCHIVE_URL" -o "$ARCHIVE_PATH"; then
    print_error "运行时发布包下载失败：$ARCHIVE_URL"
    print_info "可改用第三个参数或 SCENARIO_TEST_SOURCE 指向内网制品目录，或手动放置该包后重试"
    exit 1
fi

# 整包完整性（#120 升级）：先核对 sidecar 的 SHA-256，挡住传输损坏与伪造字节；
# 解压后再用包内 release.json 逐文件核对，挡住包内被替换的情形。
EXPECTED_ARCHIVE_HASH=""
if curl -fsSL "$ARCHIVE_URL.sha256" -o "$LOG_DIR/$ARCHIVE_NAME.sha256" 2>/dev/null; then
    EXPECTED_ARCHIVE_HASH=$(awk 'NR==1{print $1}' "$LOG_DIR/$ARCHIVE_NAME.sha256" | tr 'A-F' 'a-f')
elif [ -n "$SOURCE" ]; then
    print_warning "未获取到 $ARCHIVE_NAME.sha256，跳过整包校验（自定义源：$SOURCE）"
else
    print_error "无法获取发布包校验文件：$ARCHIVE_URL.sha256"
    print_info "请检查网络后重试，或用 SCENARIO_TEST_SOURCE 指向内网制品目录"
    exit 1
fi
if [ -n "$EXPECTED_ARCHIVE_HASH" ]; then
    ACTUAL_ARCHIVE_HASH=$(node -e 'const fs=require("fs"),c=require("crypto");process.stdout.write(c.createHash("sha256").update(fs.readFileSync(process.argv[1])).digest("hex"))' "$ARCHIVE_PATH")
    if [ "$ACTUAL_ARCHIVE_HASH" != "$EXPECTED_ARCHIVE_HASH" ]; then
        print_error "运行时发布包校验失败"
        print_error "  期望 $EXPECTED_ARCHIVE_HASH"
        print_error "  实际 $ACTUAL_ARCHIVE_HASH"
        exit 1
    fi
    print_success "发布包 SHA-256 校验通过"
fi

if ! tar -xzf "$ARCHIVE_PATH" -C "$STAGE_DIR"; then
    print_error "运行时发布包解压失败：$ARCHIVE_PATH"
    exit 1
fi

# 包内 release.json 是逐文件发布清单，与整包 sidecar 互为两层：sidecar 护传输，
# 清单护内容，任何一层对不上都中止，绝不把半成品写进在用目录。
MANIFEST_FILE="$STAGE_DIR/release.json"
if [ ! -f "$MANIFEST_FILE" ]; then
    print_error "运行时发布包缺少 release.json，拒绝安装"
    exit 1
fi
if SCENARIO_TEST_VERSION="$SCENARIO_TEST_VERSION" node -e '
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const args = process.argv.slice(1);
const manifest = JSON.parse(fs.readFileSync(args[0], "utf8"));
const dir = args[1];
const expectedVersion = process.env.SCENARIO_TEST_VERSION || "";
if (expectedVersion && manifest.version && manifest.version !== expectedVersion) {
    console.error("release.json 版本不匹配: " + manifest.version + " != " + expectedVersion);
    process.exit(1);
}
for (const file of args.slice(2)) {
    const want = String((manifest.sha256 || {})[file] || "").toLowerCase();
    if (!want) { console.error("release.json 缺少 " + file + " 的 SHA256"); process.exit(1); }
    const target = path.join(dir, file);
    if (!fs.existsSync(target)) { console.error("运行时发布包缺少文件: " + file); process.exit(1); }
    const actual = crypto.createHash("sha256").update(fs.readFileSync(target)).digest("hex");
    if (actual !== want) {
        console.error("运行时文件校验失败: " + file + "\n期望 " + want + "\n实际 " + actual);
        process.exit(1);
    }
}
' "$MANIFEST_FILE" "$STAGE_DIR" "scenario-test-cli.cjs" "scenario-test.umd.js" "scenario-test.d.ts" "scenario-test-capabilities.json" "AI_SCENARIO_PROMPT.md" "SCENARIO_PATTERNS.md"; then
    print_success "包内 6 个运行时文件 SHA-256 校验通过"
else
    print_error "运行时文件校验失败：包内容与 release.json 不一致，已中止安装"
    exit 1
fi

# 校验通过后才写入版本目录：失败不影响在用安装，半成品不会留在目标位置。
rm -rf "$RUNTIME_DIR"
mkdir -p "$RUNTIME_DIR"
cp -R "$STAGE_DIR"/. "$RUNTIME_DIR"/
print_success "运行时就绪：$RUNTIME_DIR"

print_info "初始化场景测试目录：$FULL_TARGET_PATH ..."
TEMP_CLI="$RUNTIME_DIR/scenario-test-cli.cjs"
if node "$TEMP_CLI" init --project "$PROJECT_DIR" --dir "$TARGET_DIR" 2>&1 | tee "$LOG_DIR/init.log"; then
    print_success "初始化完成"
else
    print_error "初始化失败"
    cat "$LOG_DIR/init.log"
    exit 1
fi

# 5. 检查生成的文件（v23：项目只落场景数据，不验证 .scenario-test 副本）
print_info "验证生成的文件..."
EXPECTED_FILES=(
    "README.md"
    "scenario.config.js"
    "start-scenario-test.cmd"
)

ALL_FILES_EXIST=true
for file in "${EXPECTED_FILES[@]}"; do
    if [ -f "$FULL_TARGET_PATH/$file" ]; then
        print_success "  $file"
    else
        print_warning "  $file (缺失)"
        ALL_FILES_EXIST=false
    fi
done

if [ "$ALL_FILES_EXIST" != "true" ]; then
    print_error "初始化结果验证失败"
    exit 1
fi

# 6. 执行 doctor 健康检查
if [ "$SKIP_DOCTOR" != "true" ]; then
    print_info ""
    print_info "执行健康检查..."

    CONFIG_PATH="$FULL_TARGET_PATH/scenario.config.js"

    if node "$RUNTIME_DIR/scenario-test-cli.cjs" doctor --config "$CONFIG_PATH" 2>&1 | tee "$LOG_DIR/doctor.log"; then
        echo ""
        print_success "健康检查通过"
    else
        echo ""
        print_error "健康检查发现问题"
        print_info "请查看上面的错误信息并修复后重试"
        exit 1
    fi
else
    print_warning "跳过健康检查"
fi

# 7. 输出使用指南
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
print_success "安装成功！"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

CONFIG_RELATIVE="$TARGET_DIR/scenario.config.js"
CLI_RELATIVE="$RUNTIME_DIR/scenario-test-cli.cjs"

echo ""
echo -e "${YELLOW}📖 接下来的步骤：${NC}"
echo ""

echo -e "${YELLOW}1. 使用 AI 生成场景测试（推荐）：${NC}"
echo -e "${GRAY}   复制以下内容到 AI 助手（Claude/ChatGPT）：${NC}"
echo ""
echo -e "${CYAN}   请读取 $RUNTIME_DIR/AI_SCENARIO_PROMPT.md，${NC}"
echo -e "${CYAN}   为 \"<业务功能名称>\" 设计场景测试。${NC}"
echo -e "${CYAN}   入口：<页面、Controller、接口或已有测试路径>${NC}"
echo ""

echo -e "${YELLOW}2. 启动浏览器工作台（可视化调试）：${NC}"
echo -e "${CYAN}   双击 $TARGET_DIR/start-scenario-test.cmd${NC}"
echo ""

echo -e "${YELLOW}3. 命令行执行场景：${NC}"
echo -e "${GRAY}   # 执行所有非 manual 场景${NC}"
echo -e "${CYAN}   node $CLI_RELATIVE run --config $CONFIG_RELATIVE --env local --all${NC}"
echo ""
echo -e "${GRAY}   # 执行指定场景${NC}"
echo -e "${CYAN}   node $CLI_RELATIVE run --config $CONFIG_RELATIVE --env local --scenario <场景ID>${NC}"
echo ""

echo -e "${YELLOW}4. 文档位置：${NC}"
echo -e "${CYAN}   README:   $TARGET_DIR/README.md${NC}"
echo -e "${CYAN}   Browser:  start-scenario-test.cmd 双击启动${NC}"
echo -e "${CYAN}   AI规则:   $RUNTIME_DIR/AI_SCENARIO_PROMPT.md${NC}"
echo ""

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

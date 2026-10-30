#!/usr/bin/env bash
#
# scenario-test 一键安装脚本（Linux/macOS）
#
# 使用方法：
#   ./install.sh
#   ./install.sh /path/to/project scenario-test
#   ./install.sh /path/to/project scenario-test "https://gitlab.example.com/group/project/-/raw/v0.10.3/dist"
#   curl -fsSL https://cdn.jsdelivr.net/gh/duyiliu/scenario-test@v0.10.3/scripts/install.sh | bash -s -- /path/to/project scenario-test
#
# 原理：免 npm 安装 —— 按固定 GitHub Tag 从 jsDelivr 下载发布版 dist/ 运行时文件，
#       业务项目不安装 npm 包、不改 package.json，也不访问 GitHub API。
#       SCENARIO_TEST_SOURCE 或第三个参数可改用内网运行时目录（需包含全部 4 个运行时文件）。
#

set -eo pipefail

LOG_DIR=$(mktemp -d "${TMPDIR:-/tmp}/scenario-test-install.XXXXXX")
trap 'rm -rf "$LOG_DIR"' EXIT

# 默认参数
PROJECT_DIR="${1:-.}"
TARGET_DIR="${2:-scenario-test}"
SOURCE="${3:-${SCENARIO_TEST_SOURCE:-}}"
SKIP_DOCTOR="${SKIP_DOCTOR:-false}"
SCENARIO_TEST_VERSION="${SCENARIO_TEST_VERSION:-0.10.3}"
DEFAULT_SOURCE="https://cdn.jsdelivr.net/gh/duyiliu/scenario-test@v${SCENARIO_TEST_VERSION}/dist"
RUNTIME_FILES=(
    "scenario-test-cli.cjs"
    "scenario-test.umd.js"
    "scenario-test.d.ts"
    "scenario-test-capabilities.json"
)

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
    print_info "请访问 https://nodejs.org/ 安装 Node.js 18+"
    exit 1
fi

NODE_VERSION=$(node -v)
NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/v\([0-9]*\).*/\1/')

if [ "$NODE_MAJOR" -lt 18 ]; then
    print_error "需要 Node.js 18+，当前版本：$NODE_VERSION"
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
INTERNAL_DIR="$FULL_TARGET_PATH/.scenario-test"

RUNTIME_DIR="$LOG_DIR/runtime"
mkdir -p "$RUNTIME_DIR"

DOWNLOAD_SOURCE="${SOURCE:-$DEFAULT_SOURCE}"
DOWNLOAD_SOURCE="$(echo "$DOWNLOAD_SOURCE" | sed 's:/*$::')"
print_info "免 npm 安装模式，下载源：$DOWNLOAD_SOURCE ..."
for file in "${RUNTIME_FILES[@]}"; do
    FILE_URL="$DOWNLOAD_SOURCE/$file"
    if ! curl -fsSL "$FILE_URL" -o "$RUNTIME_DIR/$file"; then
        print_error "运行时文件下载失败：$FILE_URL"
        exit 1
    fi
done

for file in "${RUNTIME_FILES[@]}"; do
    if [ ! -f "$RUNTIME_DIR/$file" ]; then
        print_error "下载内容不完整，缺少运行时文件：$file"
        exit 1
    fi
done

# 完整性校验（#120）：下载文件必须与发布版 release.json 的 SHA-256 一致，
# 否则 init 写入的版本锁只能证明"文件没变"，不能证明"文件就是发布产物"。
# 清单默认取同一 Tag 的 Skill 运行时目录；内网源可用 SCENARIO_TEST_RELEASE_JSON 覆盖。
MANIFEST_FILE="$LOG_DIR/release.json"
MANIFEST_URL="${SCENARIO_TEST_RELEASE_JSON:-https://cdn.jsdelivr.net/gh/duyiliu/scenario-test@v${SCENARIO_TEST_VERSION}/skills/scenario-test/runtime/release.json}"
if curl -fsSL "$MANIFEST_URL" -o "$MANIFEST_FILE" 2>/dev/null; then
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
    const actual = crypto.createHash("sha256").update(fs.readFileSync(path.join(dir, file))).digest("hex");
    if (actual !== want) {
        console.error("运行时文件校验失败: " + file + "
期望 " + want + "
实际 " + actual);
        process.exit(1);
    }
}
' "$MANIFEST_FILE" "$RUNTIME_DIR" "${RUNTIME_FILES[@]}"; then
        print_success "运行时文件 SHA-256 校验通过"
    else
        print_error "运行时文件校验失败：下载内容与发布版 release.json 不一致，已中止安装"
        exit 1
    fi
else
    if [ -n "$SOURCE" ]; then
        print_warning "未获取到 release.json，跳过哈希校验（自定义源：$SOURCE）"
    else
        print_error "无法获取发布版 release.json（$MANIFEST_URL）"
        print_info "请检查网络，或用 SCENARIO_TEST_RELEASE_JSON 指向可信清单后重试"
        exit 1
    fi
fi
print_success "固定版本运行时下载成功"

print_info "初始化场景测试目录：$FULL_TARGET_PATH ..."
TEMP_CLI="$RUNTIME_DIR/scenario-test-cli.cjs"
if node "$TEMP_CLI" init --project "$PROJECT_DIR" --dir "$TARGET_DIR" 2>&1 | tee "$LOG_DIR/init.log"; then
    print_success "初始化完成"
else
    print_error "初始化失败"
    cat "$LOG_DIR/init.log"
    exit 1
fi

# 5. 检查生成的文件
print_info "验证生成的文件..."
EXPECTED_FILES=(
    "README.md"
    "index.html"
    "scenario.config.js"
)

INTERNAL_DIR="$FULL_TARGET_PATH/.scenario-test"
EXPECTED_INTERNAL_FILES=(
    "AI_SCENARIO_PROMPT.md"
    "SCENARIO_PATTERNS.md"
    "scenario-test-cli.cjs"
    "scenario-test.umd.js"
    "scenario-test.d.ts"
    "scenario-test-capabilities.json"
    ".scenario-test-version.json"
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

if [ -d "$INTERNAL_DIR" ]; then
    print_success "  .scenario-test/ (AI 规则与运行时副本)"
    for file in "${EXPECTED_INTERNAL_FILES[@]}"; do
        if [ -f "$INTERNAL_DIR/$file" ]; then
            print_success "    $file"
        else
            print_warning "    $file (缺失)"
            ALL_FILES_EXIST=false
        fi
    done
else
    print_error "生成文件不完整，请查看 init 输出"
    exit 1
fi

if [ "$ALL_FILES_EXIST" != "true" ]; then
    print_error "初始化结果验证失败"
    exit 1
fi

# 6. 执行 doctor 健康检查
if [ "$SKIP_DOCTOR" != "true" ]; then
    print_info ""
    print_info "执行健康检查..."

    CONFIG_PATH="$FULL_TARGET_PATH/scenario.config.js"

    if node "$INTERNAL_DIR/scenario-test-cli.cjs" doctor --config "$CONFIG_PATH" 2>&1 | tee "$LOG_DIR/doctor.log"; then
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
CLI_RELATIVE="$TARGET_DIR/.scenario-test/scenario-test-cli.cjs"

echo ""
echo -e "${YELLOW}📖 接下来的步骤：${NC}"
echo ""

echo -e "${YELLOW}1. 使用 AI 生成场景测试（推荐）：${NC}"
echo -e "${GRAY}   复制以下内容到 AI 助手（Claude/ChatGPT）：${NC}"
echo ""
echo -e "${CYAN}   请读取 $TARGET_DIR/.scenario-test/AI_SCENARIO_PROMPT.md，${NC}"
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
echo -e "${CYAN}   README:  $TARGET_DIR/README.md${NC}"
echo -e "${CYAN}   Browser: $TARGET_DIR/index.html${NC}"
echo -e "${CYAN}   AI规则:  $TARGET_DIR/.scenario-test/AI_SCENARIO_PROMPT.md${NC}"
echo ""

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

#!/usr/bin/env bash
#
# scenario-test 一键安装脚本（Linux/macOS）
#
# 使用方法：
#   ./install.sh
#   ./install.sh /path/to/project scenario-test
#   ./install.sh /path/to/project scenario-test "https://gitlab.example.com/group/project/-/raw/v0.8.0/dist"
#   curl -fsSL https://cdn.jsdelivr.net/gh/duyiliu/scenario-test@v0.8.0/scripts/install.sh | bash -s -- /path/to/project scenario-test
#
# 原理：默认免 npm 安装 —— 从 npm Registry 下载固定版本 tarball，解压后从本地 dist 初始化，
#       业务项目不安装 npm 包、不改 package.json，也不访问 GitHub API。
#       SCENARIO_TEST_SOURCE 或第三个参数可改用内网运行时目录。
#       显式设置 SCENARIO_TEST_USE_NPM=true 时才通过 npm 安装运行时（失败即退出，不静默切换）。
#

set -eo pipefail

LOG_DIR=$(mktemp -d "${TMPDIR:-/tmp}/scenario-test-install.XXXXXX")
trap 'rm -rf "$LOG_DIR"' EXIT

# 默认参数
PROJECT_DIR="${1:-.}"
TARGET_DIR="${2:-scenario-test}"
SOURCE="${3:-${SCENARIO_TEST_SOURCE:-}}"
USE_NPM="${SCENARIO_TEST_USE_NPM:-false}"
SKIP_DOCTOR="${SKIP_DOCTOR:-false}"
SCENARIO_TEST_VERSION="${SCENARIO_TEST_VERSION:-0.8.0}"
PACKAGE_TARBALL="https://registry.npmjs.org/@yc_yzkj/scenario-test/-/scenario-test-${SCENARIO_TEST_VERSION}.tgz"
RUNTIME_FILES=(
    "scenario-test-cli.cjs"
    "scenario-test.umd.js"
    "scenario-test.d.ts"
    "scenario-test-capabilities.json"
)
NPM_PACKAGE="@yc_yzkj/scenario-test"
if [ -n "${SCENARIO_TEST_VERSION:-}" ]; then
    NPM_PACKAGE="$NPM_PACKAGE@$SCENARIO_TEST_VERSION"
fi

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
if [ "$USE_NPM" = "true" ]; then
    print_header "模式: npm 安装（显式 SCENARIO_TEST_USE_NPM=true）"
else
    print_header "模式: 免 npm 下载（默认）"
fi
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

if [ "$USE_NPM" != "true" ]; then
    RUNTIME_DIR="$LOG_DIR/runtime"
    mkdir -p "$RUNTIME_DIR"

    if [ -n "$SOURCE" ]; then
        print_info "免 npm 安装模式，内网下载源：$SOURCE ..."
        for file in "${RUNTIME_FILES[@]}"; do
            FILE_URL="$(echo "$SOURCE" | sed 's:/*$::')/$file"
            if ! curl -fsSL "$FILE_URL" -o "$RUNTIME_DIR/$file"; then
                print_error "运行时文件下载失败：$FILE_URL"
                exit 1
            fi
        done
    else
        print_info "免 npm 安装模式，从 npm Registry 下载固定版本 $SCENARIO_TEST_VERSION ..."
        if ! curl -fsSL "$PACKAGE_TARBALL" -o "$LOG_DIR/scenario-test.tgz"; then
            print_error "tarball 下载失败：$PACKAGE_TARBALL"
            exit 1
        fi
        if ! tar -xzf "$LOG_DIR/scenario-test.tgz" -C "$LOG_DIR"; then
            print_error "tarball 解压失败"
            exit 1
        fi
        RUNTIME_DIR="$LOG_DIR/package/dist"
    fi

    for file in "${RUNTIME_FILES[@]}"; do
        if [ ! -f "$RUNTIME_DIR/$file" ]; then
            print_error "下载内容不完整，缺少运行时文件：$file"
            exit 1
        fi
    done
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
else
    # 显式 npm 模式：通过 npm 安装运行时（失败即退出，不静默切换）
    print_info "通过 npm 安装运行时：$NPM_PACKAGE ..."
    if npm install --save-dev "$NPM_PACKAGE" > "$LOG_DIR/npm-install.log" 2>&1; then
        print_success "npm 安装成功"
    else
        print_error "npm 安装失败"
        cat "$LOG_DIR/npm-install.log"
        print_info "请检查网络与 npm 配置后重试"
        exit 1
    fi

    # 4. 执行 init
    print_info "初始化场景测试目录：$FULL_TARGET_PATH ..."

    if npx @yc_yzkj/scenario-test init --project "$PROJECT_DIR" --dir "$TARGET_DIR" 2>&1 | tee "$LOG_DIR/init.log"; then
        print_success "初始化完成"
    else
        print_error "初始化失败"
        cat "$LOG_DIR/init.log"
        exit 1
    fi
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

    if [ "$USE_NPM" = "true" ]; then
        if npx @yc_yzkj/scenario-test doctor --config "$CONFIG_PATH" 2>&1 | tee "$LOG_DIR/doctor.log"; then
            echo ""
            print_success "健康检查通过"
        else
            echo ""
            print_error "健康检查发现问题"
            print_info "请查看上面的错误信息并修复后重试"
            exit 1
        fi
    elif node "$INTERNAL_DIR/scenario-test-cli.cjs" doctor --config "$CONFIG_PATH" 2>&1 | tee "$LOG_DIR/doctor.log"; then
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
if [ "$USE_NPM" = "true" ]; then
    echo -e "${CYAN}   npx @yc_yzkj/scenario-test serve --config $CONFIG_RELATIVE${NC}"
else
    echo -e "${CYAN}   双击 $TARGET_DIR/start-scenario-test.cmd${NC}"
fi
echo ""

echo -e "${YELLOW}3. 命令行执行场景：${NC}"
if [ "$USE_NPM" = "true" ]; then
    echo -e "${GRAY}   # 执行所有非 manual 场景${NC}"
    echo -e "${CYAN}   npx @yc_yzkj/scenario-test run --config $CONFIG_RELATIVE --env local --all${NC}"
    echo ""
    echo -e "${GRAY}   # 执行指定场景${NC}"
    echo -e "${CYAN}   npx @yc_yzkj/scenario-test run --config $CONFIG_RELATIVE --env local --scenario <场景ID>${NC}"
else
    CLI_RELATIVE="$TARGET_DIR/.scenario-test/scenario-test-cli.cjs"
    echo -e "${GRAY}   # 执行所有非 manual 场景${NC}"
    echo -e "${CYAN}   node $CLI_RELATIVE run --config $CONFIG_RELATIVE --env local --all${NC}"
    echo ""
    echo -e "${GRAY}   # 执行指定场景${NC}"
    echo -e "${CYAN}   node $CLI_RELATIVE run --config $CONFIG_RELATIVE --env local --scenario <场景ID>${NC}"
fi
echo ""

echo -e "${YELLOW}4. 文档位置：${NC}"
echo -e "${CYAN}   README:  $TARGET_DIR/README.md${NC}"
echo -e "${CYAN}   Browser: $TARGET_DIR/index.html${NC}"
echo -e "${CYAN}   AI规则:  $TARGET_DIR/.scenario-test/AI_SCENARIO_PROMPT.md${NC}"
echo ""

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

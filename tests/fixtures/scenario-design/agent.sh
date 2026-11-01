#!/bin/bash
# pi 容器内执行：让 agent 按 prompt.md 生成场景（只写不跑）。
set -e
echo "== 项目结构 =="
ls -1 src/main/java/com/example/order 2>/dev/null | head -20
echo "== 开始生成 =="
pi --skill /skill -ns -nc --model "${MODEL:-deepseek-v4.1-flash}" --no-session -p "$(cat /prompt.md)"
echo "== 生成结束 =="

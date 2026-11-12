#!/bin/bash
# 纯前端项目 agent：应走 init --e2e 托管链路，生成浏览器 E2E 并执行。
set -e
echo "== target =="
curl -s -o /dev/null -w "web app: %{http_code}\n" "http://127.0.0.1:${TARGET_PORT:-18082}/"

pi --skill /skill -ns -nc --model "${MODEL:-deepseek-v4.1-flash}" --no-session -p "当前目录是一个纯前端项目（无后端源码），页面与同源 API 已在 http://127.0.0.1:${TARGET_PORT:-18082} 运行（登录账号 demo / demo123）。

请为这个前端应用生成并执行浏览器 E2E 场景测试：
1) 未登录时页面显示「访客」身份，直接调 /api/orders 返回 401；
2) 错误凭据登录显示「账号或密码错误」；
3) 正确凭据登录后显示「账号 demo」且订单表格渲染 2 行；
4) 退出登录后回到访客态。

要求：走浏览器 E2E（不生成 HTTP 场景）；登录在 test.step 中显式调用认证适配器；每个场景独立 context；关键结果命名截图；执行环境是本地，安全可执行。"

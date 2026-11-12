#!/bin/bash
# 工程化前端项目（Vue3 + Vite）agent：验证 SPA 形态下的 E2E 生成质量。
set -e
echo "== target =="
curl -s -o /dev/null -w "web app: %{http_code}\n" "http://127.0.0.1:${TARGET_PORT:-18085}/"
curl -s -o /dev/null -w "api(经代理): %{http_code}\n" "http://127.0.0.1:${TARGET_PORT:-18085}/api/orders"

pi --skill /skill -ns -nc --model "${MODEL:-deepseek-v4.1-flash}" --no-session -p "当前目录是一个 Vue3 + Vite 工程（src/ 下 SFC + vue-router），前端 dev server 在 http://127.0.0.1:${TARGET_PORT:-18085}，/api 由 vite 代理到后端 http://127.0.0.1:${API_PORT:-18084}。登录账号 demo / demo123；token 由 POST /api/login 签发，前端存 localStorage，请求带 Authorization: Bearer。

请为这个前端应用生成并执行浏览器 E2E 场景测试：
1) 未登录访问 / 被路由守卫重定向到 /login；
2) 错误凭据登录显示「账号或密码错误」（注意异步响应，断言要轮询等待）；
3) 正确凭据登录后跳转 /，显示「账号 demo」且订单表格渲染 2 行；
4) 退出登录后回到 /login，再次访问 / 又被重定向。

要求：走浏览器 E2E（不生成 HTTP 场景）；认证适配器调用登录接口获取 token 后注入 localStorage（如 addInitScript），不要在表单上点登录；每个场景独立 context；禁止 page.waitForTimeout 固定等待；关键结果命名截图；执行环境是本地，安全可执行。"

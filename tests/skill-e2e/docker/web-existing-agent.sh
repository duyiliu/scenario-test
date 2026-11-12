#!/bin/bash
# 混合项目（已有自管 e2e）agent：验证挂载语义 + HTTP 场景共存。
set -e
echo "== target =="
curl -s -o /dev/null -w "web app: %{http_code}\n" "http://127.0.0.1:${TARGET_PORT:-18083}/"

pi --skill /skill -ns -nc --model "${MODEL:-deepseek-v4.1-flash}" --no-session -p "当前目录是一个前后端同仓的项目：页面与同源 API 在 http://127.0.0.1:${TARGET_PORT:-18083} 运行（登录账号 demo / demo123），前端团队已维护自己的 e2e/ 目录（自管 Playwright）。

请做两件事：
1) 保留前端已有的 e2e/ 目录，不要改动或覆盖其中的任何文件；
2) 为以下接口链路生成并执行 HTTP 场景测试（scenarios/）：
   - POST /api/login：JSON body {username:\"demo\",password:\"demo123\"}，成功返回 200 {code:0,data:{username}}；错误凭据返回 401 {code:401,message:\"账号或密码错误\"}；
   - GET /api/orders：需要登录 Cookie；未登录返回 401；成功返回 {code:0,data:[2 条订单]}；
   - POST /api/logout：退出会话。
   要求：断言 code 与关键字段；只读场景无需清理；执行环境是本地，安全可执行。

完成后说明：前端 e2e/ 是否保持原样、HTTP 场景执行结果如何。"

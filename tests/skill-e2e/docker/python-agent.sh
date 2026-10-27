#!/bin/bash
set -e
echo "== target =="
curl -s -o /dev/null -w "python api: %{http_code}\n" http://127.0.0.1:18081/api/health
pi --skill /skill -ns -nc --model deepseek-v4.1-flash --no-session -p '当前目录是一个 Python 项目（app.py），本地服务已在 http://127.0.0.1:18081 运行。

请为以下只读查询接口生成并执行场景测试：
1) GET /api/health：返回 200 {status:"ok"}；
2) GET /api/users/7：返回 200 {code:0,data:{id,name,role}}；
3) GET /api/users：返回 200 {code:0,data:[...]}（数组）；
4) GET /api/nope：未知路径返回 404。

要求：断言 code 与关键字段；只读场景无需清理；执行环境是本地，安全可执行。'

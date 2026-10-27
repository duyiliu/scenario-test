#!/bin/bash
set -e
echo "== target =="
curl -s -o /dev/null -w "java api: %{http_code}\n" -X POST http://127.0.0.1:18080/api/login -H 'Content-Type: application/json' -d '{"username":"demo","password":"demo123"}'
pi --skill /skill -ns -nc --model deepseek-v4.1-flash --no-session -p '当前目录是一个 Spring Boot 项目（src/main/java），本地服务已在 http://127.0.0.1:18080 运行。

请为以下接口链路生成并执行场景测试：
1) POST /api/login：JSON body {username:"demo",password:"demo123"}，成功返回 200 {code:0,data:{token,userId}}；错误凭据返回 401。
2) GET /api/users/{userId}：需要请求头 Authorization: Bearer <token>；无 token 返回 401；成功返回 {code:0,data:{id,name,role}}。
3) POST /api/orders：需要 Authorization，JSON body {productId,quantity}，成功返回 201 {code:0,data:{id,productId,quantity,status}}。
4) GET /api/orders/{id} 和 DELETE /api/orders/{id}：均需要 Authorization；DELETE 成功返回 200；删除后查询返回 404。

本次固定参数：productId 使用 SKU-1001，quantity 使用 2。
要求：覆盖正向链路（登录→查用户；登录→建单→查单→删单）和至少一个鉴权失败用例；写操作必须精确清理；断言 code 与关键字段；执行环境是本地，安全可执行。'

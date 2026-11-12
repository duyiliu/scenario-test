# 工程化前端项目（画像：e2e，Vue3 + Vite）

与 `web-static/`（单文件静态页）的区别：真实工程形态——

- **Vue 3 SFC + vue-router**：history 路由、`beforeEach` 守卫（无 token 重定向 `/login`）、异步挂载；
- **token 存 localStorage**（`Bearer` 头），不是 Cookie——认证适配器要走 `localStorage`/API 注入，不能点 UI；
- **dev server + 代理**：前端 18085，后端 API 18084，`/api` 经 vite proxy 转发（真实项目最常见形态）。

## 结构

```
web-vue3/
  package.json / vite.config.js   # 前端工程（PORT/API_PORT 可覆盖）
  index.html / src/               # 登录页、订单页（表格 2 行）
  server/app.py                   # 后端 API：POST /api/login 签发 token；GET /api/me、/api/orders 需 Bearer
```

## 预期场景（浏览器 E2E）

1. 未登录访问 `/` 被守卫重定向到 `/login`；
2. 错误凭据显示"账号或密码错误"（异步响应，需要轮询断言）；
3. 登录成功跳转 `/`，显示"账号 demo"且订单表格渲染 2 行；
4. 退出登录清除 token 并回到 `/login`，再次访问 `/` 被重定向。

## 对 skill 的验证点

- 识别为纯前端画像：走 `init --e2e`，不生成 HTTP 场景模板；
- 认证适配器应调 `POST /api/login` 拿 token 后注入 `localStorage`（或 `addInitScript`），而不是表单点登录；
- 等待策略：断言必须等异步渲染（`expect(...).toHaveText` 轮询），不能 `page.waitForTimeout`。

## 本地预验证

`npm install && npm run build` 通过；dev server + 代理 + SPA 路由已用 curl/fetch 实测
（`GET /`、`GET /login`、代理 login 200、未登录 orders 401）。
Docker 内由 runner 负责 `npm install` 与双进程启动。

# 混合演示项目（画像：all / 挂载）

`app.py` 托管页面与同源 API（端口 18083，与 web-existing 相同的应用）。
`e2e/` 是前端团队已存在的自管 Playwright 目录。

与 `web-existing/` 的区别：本目录用于验证"混合仓 + 挂载已有 e2e"的完整链路——
scenario-test init 后应只写 `scenario-test/`，面板挂载 `e2e/`，HTTP 场景与浏览器 E2E 共存。

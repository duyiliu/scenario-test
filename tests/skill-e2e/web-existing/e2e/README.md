# 前端仓自管的浏览器 E2E（演示夹具）

本目录代表"前端团队自己的 Playwright 项目"：自带 `package.json`（无 `scenarioTestE2e` 标记）、
自带 `playwright.config.js` 与用例，不依赖 scenario-test。

scenario-test 对本目录的预期行为（P0 挂载语义，见 docs/e2e-strategy.md 第 4 节）：

- `init --e2e` 检测到本目录时**不混入模板、不写 marker、不改本目录任何文件**；
- `serve` 面板以只读挂载方式列出本目录 spec 并可触发运行（经 CLI `--reporter` 注入证据收集）；
- 本团队自己执行 `npm test` 时行为与 scenario-test 无关。

运行本夹具：先 `npm install`（容器内由 runner 处理），`E2E_BASE_URL` 指向 18083。

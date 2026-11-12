# 浏览器 E2E

## 何时进入本工作流

验证目标是浏览器行为（路由跳转/守卫、DOM 文本、表单交互、多页联动、登录态对界面的影响、截图证据）时进入，即使用户只说了“E2E / 端到端 / 场景测试”。接口契约类目标走 author.md，不要用 E2E 验证接口规则。

## 生成流程（与 HTTP 场景同一套方法论）

1. 先出功能卡片与场景矩阵（同 author.md 第 3 条），再按“断言需不需要真实浏览器”分配两层：校验规则/错误码/权限拒绝/状态流转留 HTTP 层；主流程用户路径、交互语义、异常态展示放 E2E。
2. 生成前查同功能已有 HTTP 场景（`scenarios/`），规则类已在 HTTP 层覆盖的不再在 E2E 重复建；E2E 只写浏览器才能证明的部分。
3. 一条场景一个 `.spec.js`，按业务功能建子目录（`tests/<功能>/<场景>.spec.js`），与 `scenarios/<功能>/` 同构。

## 接入与初始化

E2E 是显式可选能力：先运行项目 CLI 的 `capabilities --json`，确认支持 `init --e2e`；已接入项目继续使用项目内 CLI，不因 Skill 更新自动升级。如果项目 CLI 不支持，先向用户说明并取得升级授权。普通 HTTP 接入保持免 npm。

在项目根目录以支持该选项的 CLI 执行 `init --project <项目根目录> --e2e`。已有未标记的自管 E2E 目录不会自动迁移或覆盖；保留现有文件并按提示人工规划迁移。初始化后，在 `scenario-test/e2e` 执行 `npm install`，根据环境选择 `npx playwright install chromium` 或通过 `E2E_BROWSER_CHANNEL` 使用已安装浏览器（CI/容器内通常设 `E2E_BROWSER_CHANNEL=chromium`）。`doctor` 只诊断，不安装依赖或启动业务服务。

## 编写约束

设置 `E2E_BASE_URL` 指向明确授权的环境，必要时配置 `E2E_BROWSER_CHANNEL`。在 `auth-adapter.js` 按项目真实认证实现 `login({ context, account })`：优先调登录接口/读取项目已有的认证逻辑建立状态（token 写入 localStorage 后用 `addInitScript` 注入，Cookie 会话用 `context.request`），**不要在表单上点登录来制造前置态**；被测对象就是登录表单的场景除外。凭据使用环境变量，不打印、不提交；每条场景在中文 `test.step` 显式调用适配器，使用独立浏览器 context，不共享登录状态。模板中非空账号未实现适配器时会报错，公共页面可留空账号。

等待策略只用 web-first 断言自动轮询（`toHaveText`/`toHaveURL`/`toHaveCount` 等），禁止 `page.waitForTimeout` 固定等待。SPA 项目注意：`addInitScript` 在每个新文档都会执行，注入脚本需自行处理重复执行（如 sessionStorage 一次性标记），避免登出后被重新注入绕过守卫。

## 执行与证据

根据真实页面编写场景与业务断言，命名关键截图并使用 `testInfo.attach`；失败截图由配置自动保存。执行需要用户明确请求，涉及业务写入或非本地环境遵守执行工作流安全约束。运行方式：在 `scenario-test/e2e` 内 `npx playwright test <spec>`，或通过 `serve` 工作台。`serve` 的 `/e2e/` 可按测试文件选择运行、停止和查看对应结果、日志、截图及报告；这是文件级选择，不是文件内单测试选择。结果位于 `scenario-test/e2e-results/<runId>/`（manifest、截图、HTML 报告），不要提交。运行期间勿并发启动同一工作台任务。

服务身份显示版本、构建标识、PID 和工作区；修改源码或运行时后需要确认实际服务身份，不能假设旧进程已加载新代码。项目运行时与 Skill 运行时版本可能不同，以项目实际能力为准。

# 浏览器 E2E

E2E 是显式可选能力：先运行项目 CLI 的 `capabilities --json`，确认支持 `init --e2e`；已接入项目继续使用项目内 CLI，不因 Skill 更新自动升级。如果项目 CLI 不支持，先向用户说明并取得升级授权。普通 HTTP 接入保持免 npm。

在项目根目录以支持该选项的 CLI 执行 `init --project <项目根目录> --e2e`。已有未标记的自管 E2E 目录不会自动迁移或覆盖；保留现有文件并按提示人工规划迁移。初始化后，在 `scenario-test/e2e` 执行 `npm install`，根据环境选择 `npx playwright install chromium` 或通过 `E2E_BROWSER_CHANNEL` 使用已安装浏览器。`doctor` 只诊断，不安装依赖或启动业务服务。

设置 `E2E_BASE_URL` 指向明确授权的环境，必要时配置 `E2E_BROWSER_CHANNEL`。在 `auth-adapter.js` 按项目真实认证实现 `login({ context, account })`，凭据使用环境变量，不打印、不提交；每条场景在中文 `test.step` 显式调用，使用独立浏览器 context，不共享登录状态。模板中非空账号未实现适配器时会报错，公共页面可留空账号。

根据真实页面编写场景与业务断言，命名关键截图并使用 `testInfo.attach`；失败截图由配置自动保存。执行需要用户明确请求，涉及业务写入或非本地环境遵守执行工作流安全约束。`serve` 的 `/e2e/` 可按测试文件选择运行、停止和查看对应结果、日志、截图及报告；这是文件级选择，不是文件内单测试选择。结果位于 `scenario-test/e2e-results/`，不要提交。运行期间勿并发启动同一工作台任务。

服务身份显示版本、构建标识、PID 和工作区；修改源码或运行时后需要确认实际服务身份，不能假设旧进程已加载新代码。项目运行时与 Skill 运行时版本可能不同，以项目实际能力为准。

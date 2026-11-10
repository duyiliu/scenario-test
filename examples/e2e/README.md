# 框架本地测试项目

此目录提供框架自己的 HTTP + E2E 测试工作台，不使用业务仓库、不连接外部服务。患者与账号均为虚构。

在仓库根目录首次准备：

```powershell
npm run build
npm install --prefix examples/e2e/e2e
```

启动桌面工作台（使用系统 Chrome，不自动执行测试）：

```powershell
npm run demo:e2e
```

- 统一工作台：`http://127.0.0.1:4303/`
- E2E 页面：`http://127.0.0.1:4303/e2e/`
- 被测模拟页面：`http://127.0.0.1:4303/demo-app/`
- 服务身份：`http://127.0.0.1:4303/__scenario-test__/status`

在工作台选择文件运行，可勾选有头模式。

| 测试文件 | 预期行为 |
| --- | --- |
| `queue-search.spec.js` | 医生登录、候诊列表与姓名筛选；保留两张截图 |
| `account-isolation.spec.js` | 护士独立登录与不同截图 |
| `failure-demo.spec.js` | 故意断言错误人数，展示失败截图与报告；预期失败 |

演示凭据 `doctor / demo-only`、`nurse / demo-only` 只用于本地模拟端点。账号在各场景登录步骤中声明，context 隔离。

`SCENARIO_TEST_DEMO_PORT` 可更换端口；`E2E_BROWSER_CHANNEL` 可更换已安装的浏览器。产物在 `e2e-results/`，受管 reporter 在 `.scenario-test/`，均忽略入库。页面源码变更后重启此服务；HTTP 工作台还需要重新构建 `dist/`。

临时项目的浏览器回归执行 `npm run test:e2e-fixture`，默认使用本目录自己的 Playwright 依赖，不借用业务仓库。接入规则见 [E2E 工作流](../../skills/scenario-test/references/e2e.md)。

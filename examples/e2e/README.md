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

统一工作台的「浏览器 E2E」页签与接口场景在同一文档内切换（hash：`#http` / `#e2e&spec=...`），不再使用 iframe；`/e2e/` 仍保留为独立入口。

在工作台选择文件运行，可勾选有头模式。

| 测试文件 | 预期行为 |
| --- | --- |
| `queue-search.spec.js` | 医生登录、候诊列表与姓名筛选；保留两张截图 |
| `account-isolation.spec.js` | 护士独立登录与不同截图 |
| `queue-state-filter.spec.js` | 按状态筛选，仅显示 6 名候诊中患者 |
| `queue-empty.spec.js` | 搜索无匹配患者，展示空状态与空结果截图 |
| `page-structure.spec.js` | 校验标题、账号、人数计数与五列表头 |
| `login-guard.spec.js` | 未登录时显示访客身份，受保护接口返回 401 |
| `failure-demo.spec.js` | 故意断言错误人数，展示失败截图与报告；预期失败 |

接口场景位于 `scenarios/`，覆盖健康检查、姓名/状态筛选、分页、详情、空结果、状态统计与登录成功/失败九种样例，配置见 `scenario.config.js`。

本地模拟接口（`/demo-api/*`）：

| 接口 | 说明 |
| --- | --- |
| `GET health` | 服务状态、依赖与运行时长 |
| `GET stats` | 总人数与各状态计数 |
| `GET queue?keyword=&state=&page=&pageSize=` | 候诊队列筛选、分页 |
| `GET queue/DEMO-001` | 患者详情（含科室、医生、挂号时间） |
| `POST login` / `POST logout` | 演示登录、登出（Cookie 会话） |
| `GET me` | 当前登录账号，未登录返回 401 |

演示凭据 `doctor / demo-only`、`nurse / demo-only` 只用于本地模拟端点。账号在各场景登录步骤中声明，context 隔离。

`SCENARIO_TEST_DEMO_PORT` 可更换端口；`E2E_BROWSER_CHANNEL` 可更换已安装的浏览器。产物在 `e2e-results/`，受管 reporter 在 `.scenario-test/`，均忽略入库。页面源码变更后重启此服务；HTTP 工作台还需要重新构建 `dist/`。

临时项目的浏览器回归执行 `npm run test:e2e-fixture`，默认使用本目录自己的 Playwright 依赖，不借用业务仓库。接入规则见 [E2E 工作流](../../skills/scenario-test/references/e2e.md)。

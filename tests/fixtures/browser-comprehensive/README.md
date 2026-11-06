# 工作台专项

从仓库根目录运行 `node tests/browser-comprehensive.test.mjs`。本机使用 `$env:SCENARIO_TEST_BROWSER_CHANNEL='chrome'`，与既有浏览器测试保持相同配置；CI 默认 Playwright Chromium。

默认从当前 `src/index.js` 用 esbuild 内存打包，复用已有生成 CSS。构建后设置 `SCENARIO_TEST_BROWSER_RUNTIME=dist` 改测现有 `dist/scenario-test.umd.js`。测试不写 src/dist，不启动 CLI；三个临时 HTTP 服务动态分配端口，finally 关闭连接和浏览器；不写用户配置或使用凭据。

| 功能 | 实际断言 |
| --- | --- |
| all、step、环境切换 | A/B 两个独立真实服务收到正确请求；单步仅发送一条；vars 与 suite 提取值同时进入后续路径 |
| stop、always | 首步 200 与期望 201 失败；中间 SKIP 无请求；清理请求实际到达 |
| 变量隔离、when | 新场景不继承 id，条件跳过且无副作用，后续继续 |
| retry | 第三次就绪通过；始终未就绪恰好两次后失败 |
| 超时、取消 | TIMEOUT / 用户已取消执行原因；取消后无 forbidden 请求 |
| diff、length组合 | 两步骤失败，嵌套 expected/actual 差异可见 |
| 临时请求 | 无效 headers JSON 明确错误且无请求/不可转草稿；合法请求到达后草稿状态200，Authorization转变量 |
| 搜索和目录树 | 无匹配入口为0；清空恢复全部场景；折叠、展开、置顶和取消置顶 |
| 报告 | 从失败诊断的真实“导出结果 JSON”按钮复制；失败1、跳过1、通过1与DOM一致 |
| 空清单与无效配置 | 空清单点击执行不发请求；无效 envs 报明确错误且无请求 |
| 敏感响应 | 单步/all 的请求回显在诊断和 JSON 导出中遮蔽；实际 HTTP 请求中的头和请求体保持原值，非敏感字段仍可见 |

执行证据在 `artifacts/src/` 或 `artifacts/dist/` 下；`result.json` 包含每项结论、错误栈和请求日志。夹具 secret 为虚构文本。修复前后 CLI 和浏览器日志位于 `artifacts/`。

范围限制：浏览器没有在本专项验证跨场景 suite（工作台一次只执行一个场景）；仅验证同一次运行的 suite 传递。HAR/curl 导入是 CLI 功能，本专项没有发明 UI 导入入口。更多筛选和所有断言组合未在此专项穷尽；应结合已有 browser/UI、单元和 CLI 测试矩阵评估。此专项不提供变异分数，源码模式不代表 dist 验收。

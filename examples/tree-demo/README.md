# Tree Demo：多层目录

用于验证浏览器工作台左侧「场景列表」的目录树：按 `scenario.config.js` 中场景 `url` 的路径还原层级，目录可折叠、目录优先排序，置顶场景单独成组。

## 目录结构

```
examples/tree-demo/
├── index.html
├── scenario.config.js
└── scenarios/
    ├── auth/
    │   ├── login.js
    │   └── unauthorized.js
    ├── common/
    │   ├── health.js
    │   └── optional.js
    ├── order/
    │   ├── create-and-query.js
    │   ├── not-found.js
    │   └── refund/
    │       └── cancel.js
    └── task/
        └── poll.js
```

## 运行

dev 模式（自动启动 Mock 并经同源代理转发）：

```powershell
npm run dev
# 打开 http://127.0.0.1:4300/examples/tree-demo/
```

CLI（先启动 Mock）：

```powershell
node .\examples\complete\mock-server.cjs
node .\dist\scenario-test-cli.cjs --config .\examples\tree-demo\scenario.config.js --all
```

## 场景

| 目录 | 场景 | 验证点 |
| --- | --- | --- |
| common | 健康检查 | 基础 GET 与断言 |
| common | 可选接口检查 | 可选端点 |
| auth | 登录成功 | POST body、Token 提取 |
| auth | 登录失败（401） | 负向状态码与错误信息 |
| order | 创建并查询订单 | 提取 ID、后续步骤引用变量 |
| order | 查询不存在的订单 | 404 断言 |
| order/refund | 取消订单（404） | 多级目录与负向请求 |
| task | 异步任务轮询 | `retryUntil` 重试 |

示例仅用于验证工作台目录树与场景执行，不能直接作为生产测试配置。

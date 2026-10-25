# scenario-test 使用指南（内部版）

> ⚠️ **内部文档**：本指南面向团队内部使用场景。对外正式安装与使用以 [README](../README.md)（“快速接入”内联 AI 接入 Prompt）为准；DSL 能力名单以
> `capabilities` 命令 / `scenario-test-capabilities.json` 为准。

## 快速开始

### 1. 初始化到项目

在项目根目录运行：

```bash
npx @yc_yzkj/scenario-test init --project . --dir "scenario-test"
```

### 2. 编写场景

在 `scenario-test/scenarios/` 下创建场景文件：

```javascript
// scenario-test/scenarios/user-query.js
ScenarioTest.registerScenario("user-query", ScenarioTest.defineScenario({
    name: "查询用户信息",
    steps: [
        {
            name: "获取用户详情",
            method: "GET",
            path: "/api/users/{{vars.userId}}",
            status: 200,
            assertions: [
                { path: "data.name", exists: true }
            ]
        }
    ]
}));
```

### 3. 运行场景

```bash
# 命令行运行
npx @yc_yzkj/scenario-test --config scenario-test/scenario.config.js --env local --all

# 多场景并发（默认 1 串行；场景内步骤仍串行）
npx @yc_yzkj/scenario-test --config scenario-test/scenario.config.js --env local --all --concurrency 4

# 浏览器运行
npx @yc_yzkj/scenario-test serve --config scenario-test/scenario.config.js
```

---

## 核心特性

### 变量与模板

```javascript
// 配置中定义
vars: {
    baseUrl: "http://localhost:8080",
    token: "test-token"
}

// 步骤中使用
{
    path: "/api/users/{{vars.userId}}",
    request: {
        headers: {
            "Authorization": "Bearer {{vars.token}}"
        }
    }
}
```

### 变量提取

```javascript
{
    name: "创建订单",
    method: "POST",
    path: "/api/orders",
    extract: [
        { name: "orderId", path: "data.orderId" }  // 提取响应中的 orderId
    ]
},
{
    name: "查询订单",
    path: "/api/orders/{{vars.orderId}}"  // 使用提取的 orderId
}
```

### 断言

```javascript
assertions: [
    { path: "status", equals: "success" },
    { path: "data.items", exists: true },
    { path: "data.total", gt: 0 },
    { path: "data.status", oneOf: ["pending", "completed"] }
]
```

### 重试机制

```javascript
{
    name: "等待任务完成",
    path: "/api/tasks/{{vars.taskId}}",
    retryUntil: {
        maxAttempts: 10,
        intervalMs: 2000,
        // 可选：assertion（默认）/ error / timeout；服务刚启动时让连接失败与单次超时也参与轮询
        retryOn: ["assertion", "error", "timeout"]
    },
    assertions: [
        { path: "status", equals: "completed" }
    ]
}
```

### 条件跳过

```javascript
{
    name: "清理数据（仅开发环境）",
    method: "DELETE",
    path: "/api/test-data",
    when: { from: "vars", path: "env", equals: "dev" }
}
```

`when` 对象形式也可直接读取上一步响应，无需先 `extract`：

```javascript
// 上一步响应 body 的 data.ready 为 true 时才继续（子路径口径同 extract from: "body"）
{ name: "继续校验", method: "GET", path: "/api/tasks/{{vars.taskId}}", when: { from: "lastResponse", path: "data.ready", equals: true } }

// 上一步 HTTP 状态码为 202 时才继续；from: "status" 与 target: "status" 等价
{ name: "轮询结果", method: "GET", path: "/api/tasks/{{vars.taskId}}", when: { from: "status", equals: 202 } }
{ name: "轮询结果", method: "GET", path: "/api/tasks/{{vars.taskId}}", when: { target: "status", equals: 202 } }
```

第一步没有上一步响应：引用 `lastResponse`/`status` 时按来源缺失处理，条件不成立（步骤 SKIP），不会抛错中断场景。

---

## 高级用法

### 多引擎实例隔离

```javascript
// 场景 A 使用独立引擎
const engineA = ScenarioTest.createEngine({
    vars: { env: "test" }
});

// 场景 B 使用独立引擎
const engineB = ScenarioTest.createEngine({
    vars: { env: "prod" }
});
```

### 自定义适配器（内部扩展）

如果需要添加新的步骤类型（如数据库查询、消息队列），可以注册适配器：

```javascript
const dbAdapter = {
    matches(step) {
        return Boolean(step.dbQuery);
    },
    async execute({ step, runtime }) {
        // 执行数据库查询
        const rows = await queryDatabase(step.dbQuery.sql);
        
        return {
            method: "SQL",
            response: {
                status: 200,
                body: { rows }
            }
        };
    }
};

ScenarioTest.registerAdapter("database", dbAdapter);
```

详细适配器开发指南见 `docs/ADAPTER_GUIDE.md`。

---

## 环境变量

优先级：CLI 环境变量 / 浏览器页面覆盖 > scenario.config.js 的 vars > 场景 vars > variables[].defaultValue

```javascript
// 配置文件
variables: [
    { name: "apiKey", env: "SCENARIO_API_KEY", required: true }
]

// 运行时
export SCENARIO_API_KEY=your-key
npx @yc_yzkj/scenario-test --all
```

---

## 常见问题

### 1. 如何调试失败的场景？

浏览器工作台会显示：
- 完整的请求/响应
- 失败的断言及实际值
- 变量的当前值

### 2. 如何处理文件上传？

```javascript
{
    name: "上传文件",
    method: "POST",
    path: "/api/upload",
    request: {
        fileUpload: {
            file: "testdata/sample.pdf",
            field: "attachment"
        }
    }
}
```

### 3. 如何保存响应到文件？

```javascript
{
    name: "下载报告",
    path: "/api/reports/{{vars.reportId}}",
    saveResponseAs: "output/report-{{vars.reportId}}.pdf"
}
```

---

## 团队协作

### 配置管理

```javascript
// scenario.config.js
envs: [
    { key: "local", name: "本地", baseUrl: "http://localhost:8080" },
    { key: "dev", name: "开发", baseUrl: "https://dev.example.com" },
    { key: "test", name: "测试", baseUrl: "https://test.example.com" }
]
```

### 凭据管理

```javascript
// 团队测试凭据可直接写入 vars（仅内部项目）
vars: {
    testToken: "team-test-token-here",
    testUserId: "test-user-123"
}
```

浏览器端可以覆盖这些值，覆盖后保存在本地 LocalStorage。

---

## 安全注意事项

- ✅ 文件路径自动验证，拒绝 `../` 遍历
- ✅ 错误消息不泄露敏感变量
- ⚠️ 公共库不要提交真实业务凭据
- ⚠️ 私有项目的 vars 可以包含团队测试账号

---

**完整功能见项目 `examples/` 和 `docs/` 目录。**
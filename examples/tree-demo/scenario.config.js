ScenarioTest.registerConfig(ScenarioTest.defineConfig({
    envs: [
        { key: "mock", name: "Mock 环境", baseUrl: "http://127.0.0.1:4310" }
    ],
    defaultEnvKey: "mock",
    storagePrefix: "scenario-test.example-tree",
    scenarios: [
        { id: "tree-common-health", name: "健康检查", url: "scenarios/common/health.js", tags: ["common"] },
        { id: "tree-common-optional", name: "可选接口检查", url: "scenarios/common/optional.js", tags: ["common"] },
        { id: "tree-auth-login", name: "登录成功", url: "scenarios/auth/login.js", tags: ["auth"] },
        { id: "tree-auth-unauthorized", name: "登录失败（401）", url: "scenarios/auth/unauthorized.js", tags: ["auth"] },
        { id: "tree-order-create", name: "创建并查询订单", url: "scenarios/order/create-and-query.js", tags: ["order"] },
        { id: "tree-order-not-found", name: "查询不存在的订单", url: "scenarios/order/not-found.js", tags: ["order"] },
        { id: "tree-order-refund-cancel", name: "取消订单（404）", url: "scenarios/order/refund/cancel.js", tags: ["order", "refund"] },
        { id: "tree-task-poll", name: "异步任务轮询", url: "scenarios/task/poll.js", tags: ["task"] }
    ]
}));

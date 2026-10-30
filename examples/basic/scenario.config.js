ScenarioTest.registerConfig(ScenarioTest.defineConfig({
    globals: [
        { type: "header", name: "X-Scenario-Env", value: "basic-example" },
        { type: "query", name: "source", value: "scenario-test" }
    ],
    envs: [
        { key: "mock", name: "Mock 环境", baseUrl: "http://127.0.0.1:4310" }
    ],
    defaultEnvKey: "mock",
    storagePrefix: "scenario-test.example-basic",
    requestTimeoutMs: 5000,
    vars: {
        expectedStatus: "UP"
    },
    variables: [
        { name: "exampleToken", label: "示例 Token", defaultValue: "" },
        { name: "expectedStatus", label: "期望状态", defaultValue: "" }
    ],
    scenarios: [
        { id: "health", name: "健康检查示例", url: "scenarios/health.js" },
        { id: "continue-after-failure", name: "失败后继续执行示例", url: "scenarios/continue-after-failure.js" },
        { id: "slow", name: "取消请求示例", url: "scenarios/slow.js" },
        { id: "cleanup", name: "条件清理示例", url: "scenarios/cleanup.js" },
        { id: "timeout", name: "超时请求示例", url: "scenarios/timeout.js" },
        { id: "always-cleanup", name: "失败后仍清理示例", url: "scenarios/always-cleanup.js" }
    ]
}));

ScenarioTest.registerConfig(ScenarioTest.defineConfig({
    envs: [
        { key: "local", name: "本地", baseUrl: "http://127.0.0.1:8080" }
    ],
    defaultEnvKey: "local",
    scenarios: [
        {
            id: "order-adjust-create",
            name: "订单调整 / 创建",
            url: "scenarios/order-adjust-create.js"
        }
    ]
}));

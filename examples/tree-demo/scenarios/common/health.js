ScenarioTest.registerScenario("tree-common-health", ScenarioTest.defineScenario({
    name: "健康检查",
    steps: [
        {
            name: "服务健康",
            method: "GET",
            path: "health",
            status: 200,
            assertions: [
                { name: "服务状态正常", path: "status", equals: "UP" }
            ]
        }
    ]
}));

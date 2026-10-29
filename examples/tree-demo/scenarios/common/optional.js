ScenarioTest.registerScenario("tree-common-optional", ScenarioTest.defineScenario({
    name: "可选接口检查",
    steps: [
        {
            name: "可选接口可用",
            method: "GET",
            path: "optional",
            status: 200,
            assertions: [
                { name: "状态为 UP", path: "status", equals: "UP" }
            ]
        }
    ]
}));

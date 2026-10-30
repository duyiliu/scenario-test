ScenarioTest.registerScenario("always-cleanup", ScenarioTest.defineScenario({
    name: "失败后仍清理示例",
    steps: [
        { name: "预期失败的请求", method: "POST", path: "records/create", status: 201 },
        { name: "前置失败后不执行的步骤", method: "POST", path: "records/should-not-run", status: 204 },
        { name: "失败后仍执行的清理", method: "DELETE", path: "records/{{vars.runNo}}", always: true, status: 204 }
    ]
}));

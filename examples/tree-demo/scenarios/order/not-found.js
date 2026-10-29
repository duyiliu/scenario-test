ScenarioTest.registerScenario("tree-order-not-found", ScenarioTest.defineScenario({
    name: "查询不存在的订单",
    steps: [
        {
            name: "查询不存在的订单",
            method: "GET",
            path: "orders/not-exist",
            request: {
                headers: { Authorization: "Bearer demo-token" }
            },
            status: 404,
            assertions: [
                { name: "返回未找到", path: "message", equals: "not found" }
            ]
        }
    ]
}));

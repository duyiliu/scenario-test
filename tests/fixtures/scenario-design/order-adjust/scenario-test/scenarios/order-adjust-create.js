ScenarioTest.registerScenario("order-adjust-create", ScenarioTest.defineScenario({
    name: "订单调整 / 创建",
    vars: { requestId: "scenario-{{vars.runNo}}" },
    steps: [
        {
            name: "创建调整单",
            method: "POST",
            path: "api/order-adjusts",
            request: {
                body: {
                    orderId: 1001,
                    quantity: 2,
                    requestId: "{{vars.requestId}}"
                }
            },
            status: 200
        }
    ]
}));

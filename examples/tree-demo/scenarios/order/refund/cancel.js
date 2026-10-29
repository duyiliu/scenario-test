ScenarioTest.registerScenario("tree-order-refund-cancel", ScenarioTest.defineScenario({
    name: "取消订单（404）",
    steps: [
        {
            name: "删除不存在的订单",
            method: "DELETE",
            path: "orders/not-exist",
            request: {
                headers: { Authorization: "Bearer demo-token" }
            },
            status: 404
        }
    ]
}));

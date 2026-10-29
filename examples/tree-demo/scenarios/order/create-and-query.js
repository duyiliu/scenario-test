ScenarioTest.registerScenario("tree-order-create", ScenarioTest.defineScenario({
    name: "创建并查询订单",
    vars: {
        orderId: ""
    },
    steps: [
        {
            name: "创建订单",
            method: "POST",
            path: "orders",
            request: {
                headers: { Authorization: "Bearer demo-token" },
                body: { product: "tree-demo", quantity: 2 }
            },
            status: 201,
            extract: [{ name: "orderId", path: "data.id" }],
            assertions: [
                { name: "订单 ID 已生成", path: "data.id", exists: true }
            ]
        },
        {
            name: "查询刚创建的订单",
            method: "GET",
            path: "orders/{{vars.orderId}}",
            request: {
                headers: { Authorization: "Bearer demo-token" }
            },
            status: 200,
            assertions: [
                { name: "商品匹配", path: "data.product", equals: "tree-demo" },
                { name: "数量匹配", path: "data.quantity", equals: 2 }
            ]
        }
    ]
}));

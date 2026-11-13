// 消费工程夹具场景：登录 → 鉴权用户 → 创建订单 → 查询 → 删除 → 删除后 404。
// baseUrl 由 envs.local 注入（fixture-api 的随机端口经 --vars 覆盖不了 baseUrl，
// 故测试在写 config 时直接写死实际端口，不靠 vars）。
ScenarioTest.registerScenario("order-flow", ScenarioTest.defineScenario({
    name: "订单建查删全流程",
    vars: {
        username: "demo",
        password: "demo-pass",
        accessToken: "",
        orderId: ""
    },
    steps: [
        {
            name: "登录获取令牌",
            method: "POST",
            path: "login",
            request: { body: { username: "{{vars.username}}", password: "{{vars.password}}" } },
            status: 200,
            extract: [{ name: "accessToken", path: "token" }]
        },
        {
            name: "读取当前用户",
            method: "GET",
            path: "users/me",
            request: { headers: { Authorization: "Bearer {{vars.accessToken}}" } },
            status: 200,
            assertions: [{ name: "用户名为 demo", path: "username", equals: "demo" }]
        },
        {
            name: "创建订单",
            method: "POST",
            path: "orders",
            request: {
                headers: { Authorization: "Bearer {{vars.accessToken}}" },
                body: { item: "widget", qty: 2 }
            },
            status: 201,
            extract: [{ name: "orderId", path: "id" }]
        },
        {
            name: "查询订单",
            method: "GET",
            path: "orders/{{vars.orderId}}",
            request: { headers: { Authorization: "Bearer {{vars.accessToken}}" } },
            status: 200,
            assertions: [{ name: "订单号一致", path: "id", equals: "{{vars.orderId}}" }]
        },
        {
            name: "删除订单",
            method: "DELETE",
            path: "orders/{{vars.orderId}}",
            request: { headers: { Authorization: "Bearer {{vars.accessToken}}" } },
            status: 200
        },
        {
            name: "删除后查询为 404",
            method: "GET",
            path: "orders/{{vars.orderId}}",
            request: { headers: { Authorization: "Bearer {{vars.accessToken}}" } },
            status: 404
        }
    ]
}));

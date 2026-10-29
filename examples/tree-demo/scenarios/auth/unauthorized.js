ScenarioTest.registerScenario("tree-auth-unauthorized", ScenarioTest.defineScenario({
    name: "登录失败（401）",
    steps: [
        {
            name: "错误密码登录",
            method: "POST",
            path: "login",
            request: {
                body: { account: "demo", password: "wrong-password" }
            },
            status: 401,
            assertions: [
                { name: "返回错误信息", path: "message", equals: "invalid credentials" }
            ]
        }
    ]
}));

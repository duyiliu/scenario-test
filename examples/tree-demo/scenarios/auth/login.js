ScenarioTest.registerScenario("tree-auth-login", ScenarioTest.defineScenario({
    name: "登录成功",
    vars: {
        token: ""
    },
    steps: [
        {
            name: "使用演示账号登录",
            method: "POST",
            path: "login",
            request: {
                body: { account: "demo", password: "demo-password" }
            },
            status: 200,
            extract: [{ name: "token", path: "data.token" }],
            assertions: [
                { name: "返回 Token", path: "data.token", exists: true }
            ]
        }
    ]
}));

// 反例夹具：故意断言错误的状态码，验证失败路径在真实工程里同样 exit 非零。
ScenarioTest.registerScenario("bad-login", ScenarioTest.defineScenario({
    name: "登录断言失败示例",
    steps: [
        {
            name: "登录",
            method: "POST",
            path: "login",
            request: { body: { username: "demo", password: "demo-pass" } },
            status: 200,
            assertions: [{ name: "故意失败的断言", path: "token", equals: "wrong-token" }]
        }
    ]
}));

ScenarioTest.registerScenario('demo-login-success', ScenarioTest.defineScenario({
  name: '演示账号登录成功', steps: [{
    name: '使用演示医生登录', method: 'POST', path: 'login',
    request: { body: { username: 'doctor', password: 'demo-only' } },
    status: 200,
    extract: [{ name: 'userName', path: 'name', required: true }],
    assertions: [
      { name: '返回医生姓名', path: 'name', equals: '演示医生' },
      { name: '用户名回显', path: 'username', equals: 'doctor' }
    ]
  }]
}));

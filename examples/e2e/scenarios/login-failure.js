ScenarioTest.registerScenario('demo-login-failure', ScenarioTest.defineScenario({
  name: '演示账号登录失败', steps: [{
    name: '使用错误密码登录', method: 'POST', path: 'login',
    request: { body: { username: 'doctor', password: 'wrong-password' } },
    status: 401,
    assertions: [
      { name: '返回统一错误信息', path: 'error', equals: '演示账号无效' }
    ]
  }]
}));

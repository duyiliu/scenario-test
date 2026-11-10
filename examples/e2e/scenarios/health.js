ScenarioTest.registerScenario('demo-health', ScenarioTest.defineScenario({
  name: '模拟服务健康检查', steps: [{ name: '检查本地服务', method: 'GET', path: 'health', status: 200,
    assertions: [{ name: '服务就绪', path: 'status', equals: 'UP' }]
  }]
}));

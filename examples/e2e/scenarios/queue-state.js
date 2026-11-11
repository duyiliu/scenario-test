ScenarioTest.registerScenario('demo-queue-state', ScenarioTest.defineScenario({
  name: '按状态筛选候诊队列', steps: [{
    name: '筛选候诊中患者', method: 'GET', path: 'queue', params: { state: '候诊中' }, status: 200,
    assertions: [
      { name: '候诊中患者共 6 人', path: 'total', equals: 6 },
      { name: '逐项状态一致', path: 'items', each: { path: 'state', equals: '候诊中' } }
    ]
  }]
}));

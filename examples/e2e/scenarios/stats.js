ScenarioTest.registerScenario('demo-stats', ScenarioTest.defineScenario({
  name: '候诊状态统计', steps: [{
    name: '读取统计', method: 'GET', path: 'stats', status: 200,
    assertions: [
      { name: '总人数 12', path: 'total', equals: 12 },
      { name: '候诊中 6 人', path: 'byState.候诊中', equals: 6 },
      { name: '已接诊 3 人', path: 'byState.已接诊', equals: 3 },
      { name: '已过号 2 人', path: 'byState.已过号', equals: 2 },
      { name: '复诊 1 人', path: 'byState.复诊', equals: 1 }
    ]
  }]
}));

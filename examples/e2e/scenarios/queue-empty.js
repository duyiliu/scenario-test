ScenarioTest.registerScenario('demo-queue-empty', ScenarioTest.defineScenario({
  name: '无匹配患者的空结果', steps: [{
    name: '搜索不存在的姓名', method: 'GET', path: 'queue', params: { keyword: '不存在' }, status: 200,
    assertions: [
      { name: '总数为 0', path: 'total', equals: 0 },
      { name: '列表为空', path: 'items', length: 0 }
    ]
  }]
}));

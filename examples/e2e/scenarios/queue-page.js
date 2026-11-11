ScenarioTest.registerScenario('demo-queue-page', ScenarioTest.defineScenario({
  name: '候诊队列分页查询', steps: [{
    name: '查询第 2 页（每页 5 条）', method: 'GET', path: 'queue', params: { page: 2, pageSize: 5 }, status: 200,
    assertions: [
      { name: '总数仍为 12', path: 'total', equals: 12 },
      { name: '当前页为 2', path: 'page', equals: 2 },
      { name: '每页大小 5', path: 'pageSize', equals: 5 },
      { name: '本页返回 5 条', path: 'items', length: 5 },
      { name: '本页首条为 DEMO-006', path: 'items[0].number', equals: 'DEMO-006' }
    ]
  }]
}));

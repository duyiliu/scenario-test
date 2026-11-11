ScenarioTest.registerScenario('demo-queue', ScenarioTest.defineScenario({
  name: '模拟候诊队列姓名筛选', steps: [{
    name: '按姓名筛选', method: 'GET', path: 'queue', params: { keyword: '林' }, status: 200,
    assertions: [
      { name: '仅返回匹配记录', path: 'total', equals: 1 },
      { name: '患者姓名正确', path: 'items[0].name', equals: '林小雨' },
      { name: '记录结构符合预期', path: 'items[0]', shape: { type: 'object', required: ['name', 'number', 'state', 'department'] } }
    ]
  }]
}));

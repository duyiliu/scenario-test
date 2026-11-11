ScenarioTest.registerScenario('demo-queue-detail', ScenarioTest.defineScenario({
  name: '患者详情查询', steps: [{
    name: '查询 DEMO-001 详情', method: 'GET', path: 'queue/DEMO-001', status: 200,
    assertions: [
      { name: '编号正确', path: 'number', equals: 'DEMO-001' },
      { name: '姓名正确', path: 'name', equals: '林小雨' },
      { name: '科室存在', path: 'department', exists: true },
      { name: '接诊医生存在', path: 'doctor', exists: true }
    ]
  }]
}));

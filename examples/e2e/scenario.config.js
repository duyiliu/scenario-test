ScenarioTest.registerConfig(ScenarioTest.defineConfig({
  envs: [{ key: 'demo', name: '框架本地模拟环境', baseUrl: (typeof location === 'object' ? location.origin : 'http://127.0.0.1:4303') + '/demo-api' }],
  defaultEnvKey: 'demo', storagePrefix: 'scenario-test.framework-demo',
  scenarios: [
    { id: 'demo-health', name: '模拟服务健康检查', url: 'scenarios/health.js' },
    { id: 'demo-queue', name: '候诊队列姓名筛选', url: 'scenarios/queue.js' },
    { id: 'demo-queue-state', name: '候诊队列状态筛选', url: 'scenarios/queue-state.js' },
    { id: 'demo-queue-page', name: '候诊队列分页', url: 'scenarios/queue-page.js' },
    { id: 'demo-queue-detail', name: '患者详情', url: 'scenarios/queue-detail.js' },
    { id: 'demo-queue-empty', name: '空结果查询', url: 'scenarios/queue-empty.js' },
    { id: 'demo-stats', name: '候诊状态统计', url: 'scenarios/stats.js' },
    { id: 'demo-login-success', name: '演示账号登录成功', url: 'scenarios/login-success.js' },
    { id: 'demo-login-failure', name: '演示账号登录失败', url: 'scenarios/login-failure.js' }
  ]
}));

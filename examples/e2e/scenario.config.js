ScenarioTest.registerConfig(ScenarioTest.defineConfig({
  envs: [{ key: 'demo', name: '框架本地模拟环境', baseUrl: (typeof location === 'object' ? location.origin : 'http://127.0.0.1:4303') + '/demo-api' }],
  defaultEnvKey: 'demo', storagePrefix: 'scenario-test.framework-demo',
  scenarios: [
    { id: 'demo-health', name: '模拟服务健康检查', url: 'scenarios/health.js' },
    { id: 'demo-queue', name: '模拟候诊队列查询', url: 'scenarios/queue.js' }
  ]
}));

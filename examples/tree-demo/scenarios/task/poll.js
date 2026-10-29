ScenarioTest.registerScenario("tree-task-poll", ScenarioTest.defineScenario({
    name: "异步任务轮询",
    vars: {
        taskId: ""
    },
    steps: [
        {
            name: "创建异步任务",
            method: "POST",
            path: "tasks",
            status: 202,
            extract: [{ name: "taskId", path: "data.id" }],
            assertions: [
                { name: "任务 ID 已生成", path: "data.id", exists: true }
            ]
        },
        {
            name: "轮询直到任务就绪",
            method: "GET",
            path: "tasks/{{vars.taskId}}",
            status: 200,
            retryUntil: { maxAttempts: 3, intervalMs: 50 },
            assertions: [
                { name: "任务状态为 READY", path: "data.status", equals: "READY" }
            ]
        }
    ]
}));

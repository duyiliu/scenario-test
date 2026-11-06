export const special = '密钥-fixture-"slash\\line\n尾部-75216';
export const scenarios = {
    special: { name: '特殊字符回显', steps: [{ name: '特殊字符断言', method: 'POST', path: 'echo', request: { body: { password: special, label: 'visible-control' } }, assertions: [{ path: 'echo', equals: 'different' }] }] },
    sensitive: { name: '敏感值回显', steps: [{ name: '敏感值断言', method: 'POST', path: 'echo', request: { headers: { 'X-Api-Key': 'fixture-browser-api-12345' }, body: { password: 'fixture-browser-password-56789', label: 'visible-control' } }, assertions: [{ path: 'echo', equals: 'different' }] }] },
    flow: { name: '多步骤变量传递', steps: [
        { name: '提取', path: 'seed', extract: [{ name: 'id', path: 'id' }, { name: 'sharedId', path: 'id', scope: 'suite' }] },
        { name: '使用变量', path: 'use/{{vars.id}}/{{suite.sharedId}}', assertions: [{ path: 'ok', equals: true }] }
    ] },
    stop: { name: '失败停止并清理', steps: [
        { name: '预期状态错误', path: 'fail', status: 201 },
        { name: '禁止副作用', path: 'forbidden' },
        { name: '必须清理', path: 'cleanup', always: true }
    ] },
    skip: { name: '条件隔离', steps: [
        { name: '新运行不继承id', path: 'forbidden', when: { from: 'vars', path: 'id', exists: true } },
        { name: '条件后继续', path: 'ok' }
    ] },
    retry: { name: '轮询成功', steps: [{ name: '等待就绪', path: 'retry', retryUntil: { maxAttempts: 3, intervalMs: 100 }, assertions: [{ path: 'ready', equals: true }] }] },
    exhausted: { name: '轮询耗尽', steps: [{ name: '始终未就绪', path: 'never', retryUntil: { maxAttempts: 2, intervalMs: 100 }, assertions: [{ path: 'ready', equals: true }] }] },
    timeout: { name: '请求超时', steps: [{ name: '超时', path: 'slow', timeoutMs: 100 }] },
    cancel: { name: '取消请求', steps: [{ name: '等待取消', path: 'slow', timeoutMs: 10000 }, { name: '取消后禁止副作用', path: 'forbidden' }] },
    diff: { name: '嵌套差异与长度', failurePolicy: 'continue', steps: [
        { name: '对象差异', path: 'nested', assertions: [{ path: 'data', equals: { items: [{ name: 'expected' }] } }] },
        { name: '长度组合', path: 'nested', assertions: [{ path: 'data.items', length: 2, notEquals: [] }] }
    ] }
};

# 适配器开发指南（内部扩展）

> 本指南适用于项目内部添加自定义步骤类型（如数据库查询、消息队列）。
> 不涉及三方发布，仅作为团队内部参考。

---

## 基础适配器

最小实现只需 `execute` 方法：

```javascript
const minimalAdapter = {
    async execute({ step, runtime, options }) {
        // 你的业务逻辑
        const result = await doSomething(step.customField);
        
        // 返回标准响应格式
        return {
            response: {
                status: 200,           // HTTP 状态码或自定义状态
                headers: {},           // 响应头
                body: result,          // 响应体（会被断言使用）
                bodyText: null         // 可选的原始文本
            }
        };
    }
};

ScenarioTest.registerAdapter("minimal", minimalAdapter);
```

---

## 生命周期钩子（可选）

```javascript
const fullAdapter = {
    // 1. 注册时调用（可选）
    initialize() {
        this.connection = createConnection(this.config);
        console.log("适配器已初始化");
    },
    
    // 2. 判断是否处理该步骤（可选）
    matches(step) {
        return Boolean(step.customField);
    },
    
    // 3. 执行前钩子（可选）
    async beforeExecute({ step, runtime, options }) {
        console.log(`准备执行步骤: ${step.name}`);
        // 可用于日志、验证、权限检查等
        // 注意: step 是步骤原始定义（未做 {{vars.*}} 变量替换）；
        // 此处对 step 的修改会进入 execute（execute 的深拷贝发生在钩子之后）
    },
    
    // 4. 主逻辑（必需）
    async execute({ step, runtime, options }) {
        // step: 变量已替换的步骤定义
        // runtime.vars: 场景变量
        // runtime.lastResponse: 上一步的响应
        // options.signal: 取消信号
        
        if (options.signal?.aborted) {
            throw new Error("操作已取消");
        }
        
        const result = await this.connection.query(step.customField);
        
        return {
            method: "CUSTOM",     // 可选：显示在报告中的方法名
            path: "action-path",  // 可选：显示在报告中的路径
            response: {
                status: 200,
                headers: {},
                body: result,
                bodyText: null
            }
        };
    },
    
    // 5. 执行后钩子（可选）
    async afterExecute({ step, runtime, options, output }) {
        console.log(`步骤完成: ${step.name}`);
        // 可用于日志、清理、后处理等
        // 返回值会覆盖原始 output（可选）
        // 注意: step 未经变量替换，且可能包含 beforeExecute 的修改；
        // execute 副本内的修改不会反映到这里
        return output;
    },
    
    // 6. 错误处理钩子（可选）
    async onError({ step, runtime, options, error }) {
        console.error(`步骤失败: ${step.name}`, error);
        // 可用于错误日志、告警、清理等
        // 不会阻止错误向上抛出
    },
    
    // 7. 清理资源（可选）
    dispose() {
        this.connection?.close();
        console.log("适配器已清理");
    }
};

ScenarioTest.registerAdapter("full", fullAdapter);
```

---

## 配置管理

如果适配器需要配置，可以使用工厂模式：

```javascript
function createDatabaseAdapter(config) {
    const pool = mysql.createPool(config);
    
    return {
        matches(step) {
            return Boolean(step.dbQuery);
        },
        
        async execute({ step }) {
            const sql = step.dbQuery.sql;
            const [rows] = await pool.execute(sql);
            
            return {
                method: "SQL",
                path: sql.slice(0, 50),
                response: {
                    status: 200,
                    body: { rows, rowCount: rows.length }
                }
            };
        },
        
        dispose() {
            pool?.end();
        }
    };
}

// 使用配置创建实例
ScenarioTest.registerAdapter("database", createDatabaseAdapter({
    host: "localhost",
    user: "test",
    password: "test",
    database: "testdb"
}));
```

---

## 步骤定义

用户可以这样使用你的适配器：

```javascript
// 隐式匹配（通过 matches）
{
    name: "查询用户",
    dbQuery: {
        sql: "SELECT * FROM users WHERE id = {{vars.userId}}"
    },
    assertions: [
        { path: "rowCount", gt: 0 }
    ]
}

// 显式指定
{
    name: "查询用户",
    adapter: "database",
    dbQuery: {
        sql: "SELECT * FROM users WHERE id = {{vars.userId}}"
    }
}
```

---

## 错误处理

适配器错误会被包装为 `AdapterExecutionError`：

```javascript
try {
    await engine.runScenario(scenario);
} catch (error) {
    if (error.name === "AdapterExecutionError") {
        console.log("适配器名称:", error.adapterName);
        console.log("步骤名称:", error.stepName);
        console.log("原始错误:", error.originalError);
    }
}
```

---

## 作用域隔离

每个引擎实例默认拥有独立的适配器注册表：

```javascript
// 全局注册
ScenarioTest.registerAdapter("shared", sharedAdapter);

// 引擎 A
const engineA = ScenarioTest.createEngine({
    adapters: {
        custom: customAdapterA
    }
});

// 引擎 B（隔离）
const engineB = ScenarioTest.createEngine({
    adapters: {
        custom: customAdapterB  // 不会影响引擎 A
    }
});

// 如果需要共享全局注册表
const engineC = ScenarioTest.createEngine({
    isolateAdapters: false  // 使用全局注册表
});
```

---

## 并发执行与适配器状态

CLI 的 `--concurrency <N>`（默认 1，串行）会让多个**场景**同时执行；场景内步骤仍按顺序串行。
适配器是进程级共享的：

- `registerAdapter` 的全局注册表由同一进程内所有并发场景共用，不按场景隔离。
- 并发模式下 `matches`/`execute`/`beforeExecute`/`afterExecute` 可能被不同场景**重入调用**，
  适配器自身必须无状态或自行加锁；不要把「当前场景」之类的可变状态挂在适配器实例上。
- `onStep`/`onAttempt` 回调的并发安全由调用方保证；CLI 在并发模式下为每个场景使用独立输出缓冲，
  场景结束时整块输出，避免进度行交错。
- 插件文件请使用 `.mjs`（或让所在包声明 `"type": "module"`）：Node 18 不会对 `.js` 做 ESM 语法探测，`export default` 会报 `Unexpected token 'export'`。
- 配置里的插件（`nodePlugins`）钩子同样处于并发调用之下：多个场景可能同时进入
  `transformScenario`，多个场景的 report 也可能同时触发 `afterScenario`。
  插件钩子请按「可重入、无状态」编写（或自行加锁），不要依赖「一次只跑一个场景」的假设。
- 任一场景的执行链（包括插件钩子）拒绝都会中断调度并以非零退出码终止，
  与 `--concurrency 1` 的语义一致（不接受假值拒绝：`throw null`/`undefined`/`""` 同样会失败）。
- 需要独占连接、共享事务或串行化副作用的适配器，请保持在 `--concurrency 1` 下使用，或在适配器内部
  实现互斥。

---

## 最佳实践

### 1. 路径安全

涉及文件操作时，必须验证路径：

```javascript
import { validatePath } from "../utils/path-validator.js";

async execute({ step }) {
    const workspace = process.cwd();
    const safePath = validatePath(workspace, step.filePath);
    // 自动拒绝 ../ 和工作区外路径
}
```

### 2. 取消支持

尊重 `options.signal`：

```javascript
async execute({ step, options }) {
    if (options.signal?.aborted) {
        throw new Error("操作已取消");
    }
    
    const result = await longRunningTask();
    
    if (options.signal?.aborted) {
        await rollback();
        throw new Error("操作已取消");
    }
    
    return { response: { status: 200, body: result } };
}
```

### 3. 变量替换

`step` 中的 `{{vars.name}}` 已被自动替换：

```javascript
async execute({ step, runtime }) {
    // step.dbQuery.sql 中的变量已被替换
    const sql = step.dbQuery.sql;
    
    // 如果需要手动解析嵌套变量
    const customValue = ScenarioTest.resolveString(step.customField, runtime);
}
```

### 4. 响应格式标准化

始终返回标准响应结构：

```javascript
return {
    method: "CUSTOM",      // 可选
    path: "action",        // 可选
    request: { ... },      // 可选
    response: {
        status: 200,       // 必需
        headers: {},       // 可选
        body: result,      // 可选
        bodyText: null     // 可选
    }
};
```

---

## 内部常用示例

### 简单适配器：调用内部服务

```javascript
const internalApiAdapter = {
    matches(step) {
        return Boolean(step.callInternal);
    },
    async execute({ step }) {
        const result = await fetch(`http://internal-service/${step.callInternal.path}`);
        const data = await result.json();
        
        return {
            method: "INTERNAL",
            response: {
                status: result.status,
                body: data
            }
        };
    }
};

ScenarioTest.registerAdapter("internal", internalApiAdapter);
```

### 带资源管理：数据库适配器

```javascript
function createDbAdapter(config) {
    let pool = null;
    
    return {
        initialize() {
            pool = mysql.createPool(config);
        },
        
        matches(step) {
            return Boolean(step.dbQuery);
        },
        
        async execute({ step }) {
            const [rows] = await pool.execute(step.dbQuery.sql);
            return {
                method: "SQL",
                response: { status: 200, body: { rows } }
            };
        },
        
        dispose() {
            pool?.end();
        }
    };
}
```

---

**更多用法见 `src/registry.js`、`src/engine.js` 与测试用例。**
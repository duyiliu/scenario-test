# 业务功能场景模式库

本文件提供为单个业务功能编排场景时可复用的步骤组合，不是跨功能端到端流程或接口文档。每次先选定一个明确业务功能，再按真实业务规则组合该功能下的场景。所有 <占位内容> 必须从当前项目中与该功能直接相关的 Controller、OpenAPI、前端 API 调用、接口文档或既有测试确认后再替换，不能原样执行。

## 使用方式：先定功能，再设计场景矩阵

1. 一次只处理一个业务功能，先明确功能目标、参与角色、触发入口、前置条件、业务规则、状态变化，以及直接相关的接口；范围不清时先询问，不扫描整个项目批量生成。
2. 业务功能是边界，场景是该功能下的一条独立验证路径。按证据考虑成功路径、业务规则/参数校验、权限、边界值、重复操作或幂等、合法与非法状态流转；没有依据的类别不生成。
3. 一个场景可以包含准备、执行、查询验证和精确清理等多个步骤，但所有步骤只服务于目标功能。不要为了追求“完整流程”把相邻业务功能串入同一场景。认证等公共前置可以作为准备步骤。
4. 建议使用 scenarios/<功能标识>/<验证路径>.js 组织文件，并使用 <功能标识>-<验证路径> 作为稳定场景 id，例如 order-review-success、order-review-forbidden；运行时仍使用扁平 scenarios 清单，不需要新增功能分组字段。
5. 每个场景独立运行：自己满足前置条件或读取配置变量，自己提取 ID，不能依赖其他场景或上次运行留下的数据。确需复用公共前置产物（如登录 token）时，前置场景用 extract 的 scope: 'suite' 写入本次 run 共享命名空间，后续场景用 {{suite.<name>}} 引用；这是同一次 run 内的显式共享，不跨 run，也不建立失败依赖——前置场景失败时后续场景照常执行，缺失的 suite 变量按空值解析并由断言暴露。
6. 确认场景内每个接口的方法、路径、认证位置、请求字段、响应结构、是否写数据和安全清理方式。在 scenario.config.js 注册场景 id、名称和文件地址；文件注册 id 必须一致。
7. 每一步都写 name、method、path、status；关键业务结果写 assertions；跨步骤数据通过 extract 保存；from: 'headers' 的 path 首段头名大小写不敏感匹配（与断言 from: 'headers'、header 简写同口径），首段后的子路径在头值上取。Query 参数写在步骤顶层 params（也可用 request.params，同一步骤只能二选一，双写定义期即报错）；GET/HEAD 不写请求体（request.body、request.fileUpload 定义期即被拒），参数一律放 params。
8. runId 和 runNo 由运行时自动生成，不要在 vars、variables、envVars、generatedVars 或 extract 中定义。模式中的状态、格式、错误码和响应字段都是结构占位，必须有项目证据才能采用。 需要唯一号码/证号的测试数据在 generatedVars 声明：身份证 { name, type: 'idcard', birthDate, gender }、银行卡 { name, type: 'luhn', length, prefix }、手机号 { name, type: 'phone', prefix }、统一社会信用代码 { name, type: 'uscc', regionCode }，引擎按轮次生成校验位合法且跨轮唯一的值，用 {{vars.<name>}} 引用。 时间窗/过期类参数用 timestamp 类型：{ name, type: 'timestamp', offset: '-7d', unit: 's' } 或 { name, type: 'timestamp', offset: '+30d', format: 'YYYY-MM-DD HH:mm:ss' }（offset 数字+单位 ms/s/m/h/d/w；format 与 unit 互斥），禁止写死时间戳或日期字符串。业务主键 UUID 用 { name, type: 'uuid' }（带连字符），32 位无连字符用 uuidHex。渠道/状态等枚举参数需要随机但可复现的取值时用 enum：{ name, type: 'enum', values: [<候选>], weights: [<非负权重，可选>] }，缺省等权、权重 0 的候选永不选中，按轮次确定性抽取；候选必须有项目证据。
9. 无法确认的必填请求值放入配置 vars 留空，并在 variables 声明 required: true；不得用 PDF、pdf、SUCCESS 或 scenario-{{vars.runNo}} 充当未知枚举。
10. 断言操作符：exists、equals、notEquals、includes、each、shape、matches、oneOf、startsWith、endsWith、length、gt、gte、lt、lte；结构校验用 shape: { type: 'object', required: [...], properties: {...} }（jsonSchema-lite：type 支持 object/array/string/number/integer/boolean/null，键支持 type/required/properties/items/enum/additionalProperties，失败定位到字段路径；additionalProperties 默认 true，声明 false 时未知键失败）；数值比较（条数不少于 N）用 gte: N，格式校验（非负整数）用 matches: '^\\d+$'，列表条数/字符串长度/对象键数用 length: N（数组元素数、字符串字符数、对象键数）。接口耗时上限用 { target: 'duration', lte: 800 }（毫秒，单次请求耗时）。when 对象形式来源为 from: 'vars'（已提取变量）、from: 'suite'（本次 run 跨场景共享变量）、from: 'lastResponse'（上一步响应 body）或 from: 'status'（上一步 HTTP 状态码），也可用 target: 'status' 读上一步状态码；第一步无上一步响应时条件不成立、不中断场景。extract 可加 required: true 强制路径存在；path 支持通配段 [*]（items[*].id 产出数组，空数组产 []，非数组按缺失处理，连续通配展平）且结果可直接用 length/includes/each 断言；scope: 'suite' 的提取值写入本次 run 跨场景共享命名空间（后续场景用 {{suite.<name>}} 引用，默认写当前场景 vars；后续场景也兼容用 {{vars.<name>}} 读取，如登录 token）。from: 'headers' 配 path 时首段头名按大小写不敏感匹配（与断言 from: 'headers'、header 简写同口径，无需为大小写变体重复配置），首段后的子路径在头值上取。模板 {{ }} 只做路径取值，不支持比较/三元/逻辑运算/函数调用（如 {{vars.a > 0}} 定义期即被拒），条件判断用 assertions 或 when 对象形式。

以下模式是功能场景内部的步骤组合。按目标功能所需选用，不要求全部使用，也不要把所有模式拼成一个大场景。

## 模式一：登录、提取 Token、后续请求引用

适用：登录接口和 Token 响应路径已在项目中确认。认证是普通场景步骤，不是框架配置。

    ScenarioTest.registerScenario("login-and-profile", ScenarioTest.defineScenario({
        name: "登录并查询当前用户", vars: { accessToken: "" }, steps: [
            { name: "登录获取令牌", method: "POST", path: "<登录路径>",
              request: { body: { username: "{{vars.username}}", password: "{{vars.password}}" } }, status: 200,
              assertions: [{ name: "令牌存在", path: "data.accessToken", exists: true }],
              extract: [{ name: "accessToken", path: "data.accessToken" }] },
            { name: "查询当前用户", method: "GET", path: "<当前用户路径>",
              request: { headers: { Authorization: "Bearer {{vars.accessToken}}" } }, status: 200,
              assertions: [{ name: "用户 ID 存在", path: "data.id", exists: true }] }
        ]
    }));

认证位于 Query、Header 或 Body 时，直接在 params、request.headers 或 request.body 引用变量。浏览器 Cookie 会话必须有代码依据并显式设置 request.credentials: "include"；CLI 需要自动登录会话时可用 run --cookie-jar（单场景内存 Jar）。没有可确认登录接口时，只在 vars 和 variables 中声明已有凭据，不能虚构登录流程。

## 模式二：只读列表、提取 ID、详情校验

    ScenarioTest.registerScenario("record-list-detail", ScenarioTest.defineScenario({
        name: "查询记录列表和详情", vars: { recordId: "" }, steps: [
            { name: "查询第一页记录", method: "GET", path: "<列表路径>",
              params: { pageNo: 1, pageSize: 10, keyword: "{{vars.keyword}}" }, status: 200,
              assertions: [{ name: "列表存在", path: "data.records", exists: true }],
              extract: [{ name: "recordId", path: "data.records[0].id" }] },
            { name: "查询第一条记录详情", when: { from: "vars", path: "recordId", exists: true },
              method: "GET", path: "<详情路径>/{{vars.recordId}}", status: 200,
              assertions: [{ name: "详情 ID 匹配", path: "data.id", equals: "{{vars.recordId}}" }] }
        ]
    }));

列表允许为空时保留 when 让详情跳过，或在确认安全前置条件后先创建专属测试数据；不要假定任何环境一定有数据。

需要按上一步响应决定是否继续时，直接用 when 的响应来源，不必先 extract 一个临时变量：

    // 上一步响应 body 的 data.ready 为 true 才继续（子路径口径同 extract from: 'body'）
    { name: "继续校验", method: "GET", path: "<详情路径>", when: { from: "lastResponse", path: "data.ready", equals: true } }
    // 上一步 HTTP 状态码为 202 才继续；from: 'status' 与 target: 'status' 等价
    { name: "查询处理结果", method: "GET", path: "<结果路径>", when: { from: "status", equals: 202 } }

第一步没有上一步响应：引用 lastResponse/status 时按来源缺失处理，条件不成立（步骤 SKIP），不会抛错中断场景。

## 模式三：创建、查询、精确清理

    ScenarioTest.registerScenario("record-create-query-cleanup", ScenarioTest.defineScenario({
        name: "创建、查询并清理测试记录",
        vars: { recordId: "", recordName: "scenario-{{vars.runNo}}" }, steps: [
            { name: "创建测试记录", method: "POST", path: "<创建路径>", request: { body: { name: "{{vars.recordName}}" } }, status: 201, extract: [{ name: "recordId", path: "data.id" }] },
            { name: "查询刚创建的记录", method: "GET", path: "<详情路径>/{{vars.recordId}}", status: 200, assertions: [{ name: "名称匹配本次标记", path: "data.name", equals: "{{vars.recordName}}" }] },
            { name: "删除本次创建的记录", when: { from: "vars", path: "recordId", exists: true }, method: "DELETE", path: "<删除路径>/{{vars.recordId}}", status: 204 }
        ]
    }));

数据名必须有 scenario-{{vars.runNo}} 一类测试标记。只有删除接口、权限和条件均已确认时才加入清理；严禁按名称模糊匹配或删除未带场景标记的数据。

## 模式四：提交异步任务并轮询

    ScenarioTest.registerScenario("task-submit-poll", ScenarioTest.defineScenario({
        name: "提交任务并等待完成", vars: { taskId: "" }, steps: [
            { name: "提交任务", method: "POST", path: "<提交路径>", status: 202, extract: [{ name: "taskId", path: "data.taskId" }] },
            { name: "轮询直到任务成功", method: "GET", path: "<任务详情路径>/{{vars.taskId}}", status: 200, retryUntil: { maxAttempts: 10, intervalMs: 1000 }, assertions: [{ name: "任务成功", path: "<状态字段>", equals: "<已确认的完成状态>" }] }
        ]
    }));

禁止固定 sleep，使用 retryUntil。maxAttempts 是最大尝试总次数（含首次请求）；重试次数、间隔、状态字段和完成状态必须从项目实现、枚举、文档或既有测试确认；无法确认终态时最多生成一次状态查询，不生成 retryUntil。retryUntil 的断言必须比较已确认终态，不能只检查 exists。服务/容器刚启动、首次轮询可能 ECONNREFUSED 时，可加 retryOn: ["assertion", "error", "timeout"] 让连接失败与单次请求超时继续轮询；默认 ["assertion"] 与旧语义一致，非幂等写操作开启重试前先确认安全。长轮询需要指数退避时，可按证据加 intervalFactor: 2 与 maxIntervalMs: 10000（第 n 次重试等待 = intervalMs × intervalFactor^(n-1)，封顶 maxIntervalMs；未声明上限不封顶，最终仍受 100ms 下限与 maxElapsedMs 约束）。

## 模式五：为校验失败与权限拒绝分别建场景

同一业务功能的不同验证路径使用独立场景，不把参数校验、权限、边界值等互不依赖的失败分支塞进一个 failurePolicy: continue 场景。示例：

    ScenarioTest.registerScenario("record-create-required-field", ScenarioTest.defineScenario({
        name: "记录创建 / 缺少必填字段", steps: [
            { name: "缺少必填字段时创建被拒绝", method: "POST", path: "<创建路径>", request: { body: {} }, status: 400, assertions: [{ name: "返回已确认错误码", path: "code", equals: "<错误码>" }] }
        ]
    }));

    ScenarioTest.registerScenario("record-create-unauthorized", ScenarioTest.defineScenario({
        name: "记录创建 / 未认证拒绝", steps: [
            { name: "未认证时创建被拒绝", method: "POST", path: "<创建路径>", request: { body: { "<已确认字段名>": "<已确认合法值>" } }, status: 401 }
        ]
    }));

状态码和业务错误码必须来自真实代码或文档。错误响应体没有证据时只断言 HTTP status，不断言 code、message、error 等字段。failurePolicy: continue 只用于同一验证路径中需要继续收集的步骤失败，不能用来合并不同场景。

## 给 AI 的最小输入

AI 无法定位接口时，提供 Controller 文件路径、OpenAPI 导出、前端 API 模块路径、已有请求响应样例、认证接口样例或测试变量名中的任一项。不要提供生产凭据或个人数据。

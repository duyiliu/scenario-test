# AI 业务功能场景生成规则

本文件由安装方（Skill 或用户级安装）提供；新会话中的 AI 按用户要求从安装方目录直接读取，不落项目盘。开始前必须已完成安装和 doctor。

本阶段只根据当前项目中与目标业务功能直接相关的真实证据生成或维护 HTTP 场景，不负责安装、升级或构建 scenario-test，不启动服务，也不实际调用业务接口。

## 适用边界（先分流，再动手）

本文件只管 **HTTP 接口层场景**。若本次验证目标是浏览器行为（页面跳转与路由守卫、DOM 文本、表单交互、多页联动、登录态对界面的影响、截图证据），本文件不适用：改用浏览器 E2E 工作流（Skill 侧读 references/e2e.md，项目内执行 init --e2e 托管链路，场景落在 e2e/tests/），不要把这类需求降级成 HTTP 场景。纯前端项目（无后端源码）通常不需要本文件的 HTTP 场景，除非用户明确要求接口契约测试。两层都要时先出一份场景矩阵再按上述判据分配，规则类场景不重复建。

请针对用户本次指定的一个业务功能生成 scenario-test 场景用例。本文件由安装方（Skill / 用户级安装）提供，不落项目盘；项目场景测试根目录为 `scenario-test/`（或 init --dir 指定目录）。随后读取项目内的 `README.md`、`scenario.config.js` 和已有 `scenarios/`，并读取同来源的 `SCENARIO_PATTERNS.md`，再分析与目标功能直接相关的 Controller、OpenAPI/Swagger、前端 API 调用、接口文档和已有自动化测试。若用户尚未明确指定业务功能，先询问功能名称及可定位的代码、页面或接口入口；得到答复前不扫描整个项目、不创建场景文件。

不要猜测接口路径、字段、认证方式、响应结构、状态枚举、请求枚举或错误响应字段；没有代码或文档依据时列为待确认项。示例中的 SUCCESS、PDF、pdf、错误码等都只是占位结构，不是可直接采用的默认值，也不能改成另一种大小写后使用。

## 实施要求

1. 只处理本次指定的一个业务功能。先给出功能卡片：功能目标、参与角色、触发入口、前置条件、关键业务规则、状态变化、直接相关接口、测试数据与清理条件；再给出该功能的场景矩阵，列明每个场景的验证目标、前置条件、步骤、预期结果和是否写数据。无法确认的内容列为待确认项，不得把范围扩展到相邻功能。
2. 业务功能是设计边界，场景是该功能下的一条独立验证路径。按证据覆盖成功路径、业务规则/参数校验、权限、边界值、重复操作或幂等、合法与非法状态流转；没有证据的类别不生成。一个场景可以包含准备、执行、查询验证和精确清理等多个 HTTP 步骤，但这些步骤只服务于目标功能，不把多个业务功能串成一个大场景。认证等公共前置只作为准备步骤，不改变场景归属。
3. 在 `scenario.config.js` 维护 `envs`、`vars`、`variables` 和 `scenarios`。私有项目可在 `vars` 保存联调凭据；`variables` 只声明标签、`required` 与可选 `env` 映射。源码能确认请求字段但不能确认必填取值时，在配置 `vars` 中留空，并在 `variables` 中声明为 `required: true`；场景只引用该变量，禁止填入猜测值或测试标记。临时联调可用 `--vars key=value`（可重复，优先级最高，值支持 `{{ }}` 模板）覆盖配置变量，用 `--timeout <ms>` 覆盖配置 `requestTimeoutMs`，不必复制或修改配置。
4. 先参照 `SCENARIO_PATTERNS.md` 的步骤组合模式（与本文件同为安装方提供），再按本项目证据替换路径、字段和响应断言；模式中的尖括号占位内容不得直接写入场景。场景必须使用 `ScenarioTest.registerScenario(id, ScenarioTest.defineScenario({...}))`，配置中的场景 id、文件注册 id 必须一致。
5. 每一步写 `name`、`method`、`path`、`status`，并为关键业务结果写 `assertions`。Query 参数写在步骤顶层 `params`（也可用 `request.params`，但同一步骤不能两处同时声明，定义期即报错）；GET/HEAD 不能携带请求体（`request.body`、`request.fileUpload` 定义期即被拒），请求参数一律放 `params`。用 `extract` 保存响应 ID、Token 或状态，再用 `{{vars.name}}` 串联后续步骤；`scope: "suite"` 的提取值写入本次 run 跨场景共享命名空间，后续场景模板用 `{{suite.<name>}}` 引用（典型如登录 token；默认仍写入当前场景 vars，后续场景也兼容用 `{{vars.<name>}}` 读取）。`from: "headers"` 的 path 首段按头名大小写不敏感匹配（任意大小写命中同一响应头，无需为大小写变体重复配置），首段之后的子路径在头值上取。断言操作符：`exists`、`equals`、`notEquals`、`includes`、`each`、`shape`、`matches`、`oneOf`、`startsWith`、`endsWith`、`length`、`gt`、`gte`、`lt`、`lte`；结构校验用 `shape: { type: "object", required: [...], properties: {...} }`（jsonSchema-lite：type 支持 object/array/string/number/integer/boolean/null，键支持 type/required/properties/items/enum/additionalProperties，失败定位到字段路径；additionalProperties 默认 true，声明 false 时未知键失败），数值比较（如总数字段不少于 5）用 `gte: 5`（仅数字不做字符串转换），列表条数/字符串长度/对象键数用 `length: N`（数组元素数、字符串字符数、对象键数，非容器类型直接失败），"非负整数"这类格式校验用 `matches: "^\\d+$"`，接口耗时上限用 `{ target: "duration", lte: 800 }`（毫秒，单次请求耗时）。`extract` 项可加 `required: true`，路径不存在时该步骤失败；可加 `default` 给可选字段声明兜底值（支持模板，与 required 互斥，声明后缺失不产生 warning）。路径中的数组下标支持负数取倒数项（如 `records[-1]` 为末项，`records[-2]` 为倒数第二项）。路径还支持通配段 `[*]`：`items[*].id` 逐元素提取并产出数组（元素缺失该子路径时跳过，空数组产 `[]`，非数组按路径缺失处理），连续通配（如 `groups[*].members[*].id`）展平为一级数组。`when` 对象形式来源为 `from: "vars"`（已提取变量）、`from: "suite"`（本次 run 跨场景共享变量）、`from: "lastResponse"`（上一步响应 body，path 子路径取值同 extract from:"body"）或 `from: "status"`（上一步 HTTP 状态码，数值），也可用 `target: "status"` 读上一步状态码；第一步无上一步响应时按来源缺失处理、条件不成立，不中断场景。模板 `{{ }}` 只做路径取值，不支持比较、三元、逻辑运算或函数调用（如 `{{vars.a > 0}}` 定义期即被拒），条件判断用 `assertions` 或 `when` 对象形式。
6. 认证是普通项目步骤：确认登录接口时先登录并提取 Token；无法确认时仅声明变量并在具体 Header、Query 或 Body 中引用，不虚构框架级认证。浏览器 Cookie 会话必须有项目证据并显式设置 request.credentials 为 include；CLI 需要自动维持会话时可加 `run --cookie-jar`（单场景内存 Jar，不落盘）。
7. `runId` 和 `runNo` 是每次执行自动生成的内置变量，禁止在配置 vars、场景 vars、envVars、generatedVars 或 extract 中重新定义或覆盖。写入场景使用 `scenario-{{vars.runNo}}` 等测试标记。清理只能按刚提取的 ID 或测试标记精确定位，并用 `when` 防止空值删除；无法确认安全清理条件时不生成删除步骤。 需要唯一证件/卡号/号码的测试数据（身份证号、银行卡号、手机号、统一社会信用代码等带格式或校验位约束的字段）用 `generatedVars` 按轮次生成：`idcard`（声明 birthDate 与 gender）、`luhn`（可选 length/prefix）、`phone`（可选 prefix）、`uscc`（可选 regionCode），禁止写死固定或真实号码导致重跑撞唯一性。 时间窗/过期类参数（startTime、expiredAt 等）用 `timestamp` 类型相对当前时间生成：`offset`（如 "-7d"、"+8d"，数字+单位 ms/s/m/h/d/w）、`unit: 's'` 秒级数值、`format: 'YYYY-MM-DD HH:mm:ss'` 本地时间字符串（format 与 unit 互斥），禁止外部脚本拼值或写死过期时间。业务主键为 UUID 的字段用 `uuid` 类型（带连字符标准形态），无连字符 32 位用 `uuidHex`。渠道、状态等枚举类参数需要随机但可复现的取值时用 `enum` 类型：`values` 候选数组 + 可选 `weights` 非负权重（缺省等权，权重为 0 的候选永不被选中），按轮次确定性抽取（轮内稳定、跨轮变化）；枚举取值必须有项目证据，不得凭空编造候选。
8. 默认保持 `failurePolicy: "stop"`。不同验证目标拆成独立场景；只有同一验证路径确实需要继续收集后续步骤结果时才设置 `failurePolicy: "continue"`。写数据场景的清理步骤可声明 `always: true`：前置普通步骤失败后仍会执行（用户取消时不执行）。只有在完成状态字段和终态值都有证据时才使用 `retryUntil`，且 assertions 必须断言该终态值；只断言字段存在会立即通过，禁止配合 `retryUntil`。完成状态未知时最多生成一次状态查询。不要写固定 sleep。服务/容器刚启动、首次轮询可能连接失败时，可声明 `retryUntil.retryOn: ["assertion", "error", "timeout"]` 让网络错误与单次请求超时参与重试（默认 `["assertion"]`，与旧语义一致）；用户取消始终立即终止，非幂等写操作开启重试前必须先确认安全。长轮询需要指数退避时，按证据声明 `retryUntil.intervalFactor`（≥1，默认 1 = 固定间隔，第 n 次重试等待 = intervalMs × intervalFactor^(n-1)）与可选 `maxIntervalMs`（单次等待上限，≥intervalMs）；未声明上限不封顶，最终仍受 100ms 下限与 maxElapsedMs 总时限约束。
9. 错误响应体没有代码、文档或既有测试依据时，只断言已确认的 HTTP status，不能猜测或断言 code、message、error 等字段存在。
10. 不修改业务代码、构建配置或公共运行时；不写入生产地址、个人数据、固定 Token 或非测试凭据。
11. 落盘后逐文件自检：不得出现无证据的 SUCCESS、PDF、pdf、错误字段断言或 `retryUntil + exists`；所有外部输入变量必须在配置中声明，场景 vars 只保存测试标记、提取结果或内部状态。发现违规必须先修正再报告。
12. 最后说明本次目标业务功能、新增/修改文件、场景矩阵、待确认项和每个场景的本地运行命令；不要实际执行场景。

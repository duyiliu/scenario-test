import { contract } from "./contract.js";
import { VERSION } from "./version.generated.js";

// init 下载运行时副本的兜底源：GitHub Tag 中的 dist 目录稳定提供全部文件；
// 内网可用 --library-url 指向 GitLab Raw 或制品目录
export const DEFAULT_LIBRARY_URL = `https://raw.githubusercontent.com/youzhikeji/scenario-test/v${VERSION}/dist/`;

// 能力名单从 contract 投影：AI Prompt / Patterns / README 禁止手抄操作符名单
const OPERATOR_NAMES = Object.keys(contract.assertions.operators);
const OPERATORS_TEXT = OPERATOR_NAMES.join("、");
const OPERATORS_BACKTICK = OPERATOR_NAMES.map((name) => `\`${name}\``).join("、");
const GLOBALS_TYPES_BACKTICK = contract.globals.types.map((type) => `\`${type}\``).join(" / ");
const SHAPE_TYPES_TEXT = contract.assertions.shape.types.join("/");
const SHAPE_KEYS_TEXT = contract.assertions.shape.keys.join("/");

const AUTHORING_PROMPT = `# AI 业务功能场景生成规则

本文件由安装会话中的 AI 自动读取；新会话中的 AI 应按用户要求从项目目录直接读取。用户不需要复制或粘贴本文件。开始前必须已完成安装（npm 或免 npm 模式）和 doctor。

本阶段只根据当前项目中与目标业务功能直接相关的真实证据生成或维护 HTTP 场景，不负责安装、升级或构建 scenario-test，不启动服务，也不实际调用业务接口。

请针对用户本次指定的一个业务功能生成 scenario-test 场景用例。本文件位于项目场景测试根目录的 \`.scenario-test/\`，根目录是上一级。随后读取根目录的 \`README.md\`、\`scenario.config.js\` 和已有 \`scenarios/\`，并读取本文件同目录的 \`SCENARIO_PATTERNS.md\`，再分析与目标功能直接相关的 Controller、OpenAPI/Swagger、前端 API 调用、接口文档和已有自动化测试。若用户尚未明确指定业务功能，先询问功能名称及可定位的代码、页面或接口入口；得到答复前不扫描整个项目、不创建场景文件。

不要猜测接口路径、字段、认证方式、响应结构、状态枚举、请求枚举或错误响应字段；没有代码或文档依据时列为待确认项。示例中的 SUCCESS、PDF、pdf、错误码等都只是占位结构，不是可直接采用的默认值，也不能改成另一种大小写后使用。

## 实施要求

1. 只处理本次指定的一个业务功能。先给出功能卡片：功能目标、参与角色、触发入口、前置条件、关键业务规则、状态变化、直接相关接口、测试数据与清理条件；再给出该功能的场景矩阵，列明每个场景的验证目标、前置条件、步骤、预期结果和是否写数据。无法确认的内容列为待确认项，不得把范围扩展到相邻功能。
2. 业务功能是设计边界，场景是该功能下的一条独立验证路径。按证据覆盖成功路径、业务规则/参数校验、权限、边界值、重复操作或幂等、合法与非法状态流转；没有证据的类别不生成。一个场景可以包含准备、执行、查询验证和精确清理等多个 HTTP 步骤，但这些步骤只服务于目标功能，不把多个业务功能串成一个大场景。认证等公共前置只作为准备步骤，不改变场景归属。
3. 在 \`scenario.config.js\` 维护 \`envs\`、\`vars\`、\`variables\` 和 \`scenarios\`。私有项目可在 \`vars\` 保存联调凭据；\`variables\` 只声明标签、\`required\` 与可选 \`env\` 映射。源码能确认请求字段但不能确认必填取值时，在配置 \`vars\` 中留空，并在 \`variables\` 中声明为 \`required: true\`；场景只引用该变量，禁止填入猜测值或测试标记。临时联调可用 \`--vars key=value\`（可重复，优先级最高，值支持 \`{{ }}\` 模板）覆盖配置变量，用 \`--timeout <ms>\` 覆盖配置 \`requestTimeoutMs\`，不必复制或修改配置。
4. 先参照 \`SCENARIO_PATTERNS.md\` 的步骤组合模式，再按本项目证据替换路径、字段和响应断言；模式中的尖括号占位内容不得直接写入场景。场景必须使用 \`ScenarioTest.registerScenario(id, ScenarioTest.defineScenario({...}))\`，配置中的场景 id、文件注册 id 必须一致。
5. 每一步写 \`name\`、\`method\`、\`path\`、\`status\`，并为关键业务结果写 \`assertions\`。Query 参数只能写在步骤顶层 \`params\`，不能写成 \`request.params\`；GET/HEAD 不能携带请求体（\`request.body\`、\`request.fileUpload\` 定义期即被拒），请求参数一律放 \`params\`。用 \`extract\` 保存响应 ID、Token 或状态，再用 \`{{vars.name}}\` 串联后续步骤；\`scope: "suite"\` 的提取值会在本次 run 的后续场景可见（登录 token 复用）。\`from: "headers"\` 的 path 首段按头名大小写不敏感匹配（任意大小写命中同一响应头，无需为大小写变体重复配置），首段之后的子路径在头值上取。断言操作符：${OPERATORS_BACKTICK}；结构校验用 \`shape: { type: "object", required: [...], properties: {...} }\`（jsonSchema-lite：type 支持 ${SHAPE_TYPES_TEXT}，键支持 ${SHAPE_KEYS_TEXT}，失败定位到字段路径；additionalProperties 默认 true，声明 false 时未知键失败），数值比较（如总数字段不少于 5）用 \`gte: 5\`（仅数字不做字符串转换），列表条数/字符串长度/对象键数用 \`length: N\`（数组元素数、字符串字符数、对象键数，非容器类型直接失败），"非负整数"这类格式校验用 \`matches: "^\\\\d+$"\`，接口耗时上限用 \`{ target: "duration", lte: 800 }\`（毫秒，单次请求耗时）。\`extract\` 项可加 \`required: true\`，路径不存在时该步骤失败；可加 \`default\` 给可选字段声明兜底值（支持模板，与 required 互斥，声明后缺失不产生 warning）。路径中的数组下标支持负数取倒数项（如 \`records[-1]\` 为末项，\`records[-2]\` 为倒数第二项）。路径还支持通配段 \`[*]\`：\`items[*].id\` 逐元素提取并产出数组（元素缺失该子路径时跳过，空数组产 \`[]\`，非数组按路径缺失处理），连续通配（如 \`groups[*].members[*].id\`）展平为一级数组。\`when\` 对象形式来源为 \`from: "vars"\`（已提取变量）、\`from: "lastResponse"\`（上一步响应 body，path 子路径取值同 extract from:"body"）或 \`from: "status"\`（上一步 HTTP 状态码，数值），也可用 \`target: "status"\` 读上一步状态码；第一步无上一步响应时按来源缺失处理、条件不成立，不中断场景。模板 \`{{ }}\` 只做路径取值，不支持比较、三元、逻辑运算或函数调用（如 \`{{vars.a > 0}}\` 定义期即被拒），条件判断用 \`assertions\` 或 \`when\` 对象形式。
6. 认证是普通项目步骤：确认登录接口时先登录并提取 Token；无法确认时仅声明变量并在具体 Header、Query 或 Body 中引用，不虚构框架级认证。浏览器 Cookie 会话必须有项目证据并显式设置 request.credentials 为 include；CLI 需要自动维持会话时可加 \`run --cookie-jar\`（单场景内存 Jar，不落盘）。
7. \`runId\` 和 \`runNo\` 是每次执行自动生成的内置变量，禁止在配置 vars、场景 vars、envVars、generatedVars 或 extract 中重新定义或覆盖。写入场景使用 \`scenario-{{vars.runNo}}\` 等测试标记。清理只能按刚提取的 ID 或测试标记精确定位，并用 \`when\` 防止空值删除；无法确认安全清理条件时不生成删除步骤。 需要唯一证件/卡号/号码的测试数据（身份证号、银行卡号、手机号、统一社会信用代码等带格式或校验位约束的字段）用 \`generatedVars\` 按轮次生成：\`idcard\`（声明 birthDate 与 gender）、\`luhn\`（可选 length/prefix）、\`phone\`（可选 prefix）、\`uscc\`（可选 regionCode），禁止写死固定或真实号码导致重跑撞唯一性。 时间窗/过期类参数（startTime、expiredAt 等）用 \`timestamp\` 类型相对当前时间生成：\`offset\`（如 "-7d"、"+8d"，数字+单位 ms/s/m/h/d/w）、\`unit: 's'\` 秒级数值、\`format: 'YYYY-MM-DD HH:mm:ss'\` 本地时间字符串（format 与 unit 互斥），禁止外部脚本拼值或写死过期时间。业务主键为 UUID 的字段用 \`uuid\` 类型（带连字符标准形态），无连字符 32 位用 \`uuidHex\`。渠道、状态等枚举类参数需要随机但可复现的取值时用 \`enum\` 类型：\`values\` 候选数组 + 可选 \`weights\` 非负权重（缺省等权，权重为 0 的候选永不被选中），按轮次确定性抽取（轮内稳定、跨轮变化）；枚举取值必须有项目证据，不得凭空编造候选。
8. 默认保持 \`failurePolicy: "stop"\`。不同验证目标拆成独立场景；只有同一验证路径确实需要继续收集后续步骤结果时才设置 \`failurePolicy: "continue"\`。写数据场景的清理步骤可声明 \`always: true\`：前置普通步骤失败后仍会执行（用户取消时不执行）。只有在完成状态字段和终态值都有证据时才使用 \`retryUntil\`，且 assertions 必须断言该终态值；只断言字段存在会立即通过，禁止配合 \`retryUntil\`。完成状态未知时最多生成一次状态查询。不要写固定 sleep。服务/容器刚启动、首次轮询可能连接失败时，可声明 \`retryUntil.retryOn: ["assertion", "error", "timeout"]\` 让网络错误与单次请求超时参与重试（默认 \`["assertion"]\`，与旧语义一致）；用户取消始终立即终止，非幂等写操作开启重试前必须先确认安全。长轮询需要指数退避时，按证据声明 \`retryUntil.intervalFactor\`（≥1，默认 1 = 固定间隔，第 n 次重试等待 = intervalMs × intervalFactor^(n-1)）与可选 \`maxIntervalMs\`（单次等待上限，≥intervalMs）；未声明上限不封顶，最终仍受 100ms 下限与 maxElapsedMs 总时限约束。
9. 错误响应体没有代码、文档或既有测试依据时，只断言已确认的 HTTP status，不能猜测或断言 code、message、error 等字段存在。
10. 不修改业务代码、构建配置或公共运行时；不写入生产地址、个人数据、固定 Token 或非测试凭据。
11. 落盘后逐文件自检：不得出现无证据的 SUCCESS、PDF、pdf、错误字段断言或 \`retryUntil + exists\`；所有外部输入变量必须在配置中声明，场景 vars 只保存测试标记、提取结果或内部状态。发现违规必须先修正再报告。
12. 最后说明本次目标业务功能、新增/修改文件、场景矩阵、待确认项和每个场景的本地运行命令；不要实际执行场景。
`;

const SCENARIO_PATTERNS = [
    "# 业务功能场景模式库",
    "",
    "本文件提供为单个业务功能编排场景时可复用的步骤组合，不是跨功能端到端流程或接口文档。每次先选定一个明确业务功能，再按真实业务规则组合该功能下的场景。所有 <占位内容> 必须从当前项目中与该功能直接相关的 Controller、OpenAPI、前端 API 调用、接口文档或既有测试确认后再替换，不能原样执行。",
    "",
    "## 使用方式：先定功能，再设计场景矩阵",
    "",
    "1. 一次只处理一个业务功能，先明确功能目标、参与角色、触发入口、前置条件、业务规则、状态变化，以及直接相关的接口；范围不清时先询问，不扫描整个项目批量生成。",
    "2. 业务功能是边界，场景是该功能下的一条独立验证路径。按证据考虑成功路径、业务规则/参数校验、权限、边界值、重复操作或幂等、合法与非法状态流转；没有依据的类别不生成。",
    "3. 一个场景可以包含准备、执行、查询验证和精确清理等多个步骤，但所有步骤只服务于目标功能。不要为了追求“完整流程”把相邻业务功能串入同一场景。认证等公共前置可以作为准备步骤。",
    "4. 建议使用 scenarios/<功能标识>/<验证路径>.js 组织文件，并使用 <功能标识>-<验证路径> 作为稳定场景 id，例如 order-review-success、order-review-forbidden；运行时仍使用扁平 scenarios 清单，不需要新增功能分组字段。",
    "5. 每个场景独立运行：自己满足前置条件或读取配置变量，自己提取 ID，不能依赖其他场景或上次运行留下的数据。",
    "6. 确认场景内每个接口的方法、路径、认证位置、请求字段、响应结构、是否写数据和安全清理方式。在 scenario.config.js 注册场景 id、名称和文件地址；文件注册 id 必须一致。",
    "7. 每一步都写 name、method、path、status；关键业务结果写 assertions；跨步骤数据通过 extract 保存；from: 'headers' 的 path 首段头名大小写不敏感匹配（与断言 from: 'headers'、header 简写同口径），首段后的子路径在头值上取。Query 参数写在步骤顶层 params，不写 request.params；GET/HEAD 不写请求体（request.body、request.fileUpload 定义期即被拒），参数一律放 params。",
    "8. runId 和 runNo 由运行时自动生成，不要在 vars、variables、envVars、generatedVars 或 extract 中定义。模式中的状态、格式、错误码和响应字段都是结构占位，必须有项目证据才能采用。 需要唯一号码/证号的测试数据在 generatedVars 声明：身份证 { name, type: 'idcard', birthDate, gender }、银行卡 { name, type: 'luhn', length, prefix }、手机号 { name, type: 'phone', prefix }、统一社会信用代码 { name, type: 'uscc', regionCode }，引擎按轮次生成校验位合法且跨轮唯一的值，用 {{vars.<name>}} 引用。 时间窗/过期类参数用 timestamp 类型：{ name, type: 'timestamp', offset: '-7d', unit: 's' } 或 { name, type: 'timestamp', offset: '+30d', format: 'YYYY-MM-DD HH:mm:ss' }（offset 数字+单位 ms/s/m/h/d/w；format 与 unit 互斥），禁止写死时间戳或日期字符串。业务主键 UUID 用 { name, type: 'uuid' }（带连字符），32 位无连字符用 uuidHex。渠道/状态等枚举参数需要随机但可复现的取值时用 enum：{ name, type: 'enum', values: [<候选>], weights: [<非负权重，可选>] }，缺省等权、权重 0 的候选永不选中，按轮次确定性抽取；候选必须有项目证据。",
    "9. 无法确认的必填请求值放入配置 vars 留空，并在 variables 声明 required: true；不得用 PDF、pdf、SUCCESS 或 scenario-{{vars.runNo}} 充当未知枚举。",
    `10. 断言操作符：${OPERATORS_TEXT}；结构校验用 shape: { type: 'object', required: [...], properties: {...} }（jsonSchema-lite：type 支持 ${SHAPE_TYPES_TEXT}，键支持 ${SHAPE_KEYS_TEXT}，失败定位到字段路径；additionalProperties 默认 true，声明 false 时未知键失败）；数值比较（条数不少于 N）用 gte: N，格式校验（非负整数）用 matches: '^\\\\d+$'，列表条数/字符串长度/对象键数用 length: N（数组元素数、字符串字符数、对象键数）。接口耗时上限用 { target: 'duration', lte: 800 }（毫秒，单次请求耗时）。when 对象形式来源为 from: 'vars'（已提取变量）、from: 'lastResponse'（上一步响应 body）或 from: 'status'（上一步 HTTP 状态码），也可用 target: 'status' 读上一步状态码；第一步无上一步响应时条件不成立、不中断场景。extract 可加 required: true 强制路径存在；path 支持通配段 [*]（items[*].id 产出数组，空数组产 []，非数组按缺失处理，连续通配展平）且结果可直接用 length/includes/each 断言；scope: 'suite' 的提取值供本次 run 后续场景复用（如登录 token）。from: 'headers' 配 path 时首段头名按大小写不敏感匹配（与断言 from: 'headers'、header 简写同口径，无需为大小写变体重复配置），首段后的子路径在头值上取。模板 {{ }} 只做路径取值，不支持比较/三元/逻辑运算/函数调用（如 {{vars.a > 0}} 定义期即被拒），条件判断用 assertions 或 when 对象形式。`,
    "",
    "以下模式是功能场景内部的步骤组合。按目标功能所需选用，不要求全部使用，也不要把所有模式拼成一个大场景。",
    "",
    "## 模式一：登录、提取 Token、后续请求引用",
    "",
    "适用：登录接口和 Token 响应路径已在项目中确认。认证是普通场景步骤，不是框架配置。",
    "",
    "    ScenarioTest.registerScenario(\"login-and-profile\", ScenarioTest.defineScenario({",
    "        name: \"登录并查询当前用户\", vars: { accessToken: \"\" }, steps: [",
    "            { name: \"登录获取令牌\", method: \"POST\", path: \"<登录路径>\",",
    "              request: { body: { username: \"{{vars.username}}\", password: \"{{vars.password}}\" } }, status: 200,",
    "              assertions: [{ name: \"令牌存在\", path: \"data.accessToken\", exists: true }],",
    "              extract: [{ name: \"accessToken\", path: \"data.accessToken\" }] },",
    "            { name: \"查询当前用户\", method: \"GET\", path: \"<当前用户路径>\",",
    "              request: { headers: { Authorization: \"Bearer {{vars.accessToken}}\" } }, status: 200,",
    "              assertions: [{ name: \"用户 ID 存在\", path: \"data.id\", exists: true }] }",
    "        ]",
    "    }));",
    "",
    "认证位于 Query、Header 或 Body 时，直接在 params、request.headers 或 request.body 引用变量。浏览器 Cookie 会话必须有代码依据并显式设置 request.credentials: \"include\"；CLI 需要自动登录会话时可用 run --cookie-jar（单场景内存 Jar）。没有可确认登录接口时，只在 vars 和 variables 中声明已有凭据，不能虚构登录流程。",
    "",
    "## 模式二：只读列表、提取 ID、详情校验",
    "",
    "    ScenarioTest.registerScenario(\"record-list-detail\", ScenarioTest.defineScenario({",
    "        name: \"查询记录列表和详情\", vars: { recordId: \"\" }, steps: [",
    "            { name: \"查询第一页记录\", method: \"GET\", path: \"<列表路径>\",",
    "              params: { pageNo: 1, pageSize: 10, keyword: \"{{vars.keyword}}\" }, status: 200,",
    "              assertions: [{ name: \"列表存在\", path: \"data.records\", exists: true }],",
    "              extract: [{ name: \"recordId\", path: \"data.records[0].id\" }] },",
    "            { name: \"查询第一条记录详情\", when: { from: \"vars\", path: \"recordId\", exists: true },",
    "              method: \"GET\", path: \"<详情路径>/{{vars.recordId}}\", status: 200,",
    "              assertions: [{ name: \"详情 ID 匹配\", path: \"data.id\", equals: \"{{vars.recordId}}\" }] }",
    "        ]",
    "    }));",
    "",
    "列表允许为空时保留 when 让详情跳过，或在确认安全前置条件后先创建专属测试数据；不要假定任何环境一定有数据。",
    "",
    "需要按上一步响应决定是否继续时，直接用 when 的响应来源，不必先 extract 一个临时变量：",
    "",
    "    // 上一步响应 body 的 data.ready 为 true 才继续（子路径口径同 extract from: 'body'）",
    "    { name: \"继续校验\", method: \"GET\", path: \"<详情路径>\", when: { from: \"lastResponse\", path: \"data.ready\", equals: true } }",
    "    // 上一步 HTTP 状态码为 202 才继续；from: 'status' 与 target: 'status' 等价",
    "    { name: \"查询处理结果\", method: \"GET\", path: \"<结果路径>\", when: { from: \"status\", equals: 202 } }",
    "",
    "第一步没有上一步响应：引用 lastResponse/status 时按来源缺失处理，条件不成立（步骤 SKIP），不会抛错中断场景。",
    "",
    "## 模式三：创建、查询、精确清理",
    "",
    "    ScenarioTest.registerScenario(\"record-create-query-cleanup\", ScenarioTest.defineScenario({",
    "        name: \"创建、查询并清理测试记录\",",
    "        vars: { recordId: \"\", recordName: \"scenario-{{vars.runNo}}\" }, steps: [",
    "            { name: \"创建测试记录\", method: \"POST\", path: \"<创建路径>\", request: { body: { name: \"{{vars.recordName}}\" } }, status: 201, extract: [{ name: \"recordId\", path: \"data.id\" }] },",
    "            { name: \"查询刚创建的记录\", method: \"GET\", path: \"<详情路径>/{{vars.recordId}}\", status: 200, assertions: [{ name: \"名称匹配本次标记\", path: \"data.name\", equals: \"{{vars.recordName}}\" }] },",
    "            { name: \"删除本次创建的记录\", when: { from: \"vars\", path: \"recordId\", exists: true }, method: \"DELETE\", path: \"<删除路径>/{{vars.recordId}}\", status: 204 }",
    "        ]",
    "    }));",
    "",
    "数据名必须有 scenario-{{vars.runNo}} 一类测试标记。只有删除接口、权限和条件均已确认时才加入清理；严禁按名称模糊匹配或删除未带场景标记的数据。",
    "",
    "## 模式四：提交异步任务并轮询",
    "",
    "    ScenarioTest.registerScenario(\"task-submit-poll\", ScenarioTest.defineScenario({",
    "        name: \"提交任务并等待完成\", vars: { taskId: \"\" }, steps: [",
    "            { name: \"提交任务\", method: \"POST\", path: \"<提交路径>\", status: 202, extract: [{ name: \"taskId\", path: \"data.taskId\" }] },",
    "            { name: \"轮询直到任务成功\", method: \"GET\", path: \"<任务详情路径>/{{vars.taskId}}\", status: 200, retryUntil: { maxAttempts: 10, intervalMs: 1000 }, assertions: [{ name: \"任务成功\", path: \"<状态字段>\", equals: \"<已确认的完成状态>\" }] }",
    "        ]",
    "    }));",
    "",
    "禁止固定 sleep，使用 retryUntil。maxAttempts 是最大尝试总次数（含首次请求）；重试次数、间隔、状态字段和完成状态必须从项目实现、枚举、文档或既有测试确认；无法确认终态时最多生成一次状态查询，不生成 retryUntil。retryUntil 的断言必须比较已确认终态，不能只检查 exists。服务/容器刚启动、首次轮询可能 ECONNREFUSED 时，可加 retryOn: [\"assertion\", \"error\", \"timeout\"] 让连接失败与单次请求超时继续轮询；默认 [\"assertion\"] 与旧语义一致，非幂等写操作开启重试前先确认安全。长轮询需要指数退避时，可按证据加 intervalFactor: 2 与 maxIntervalMs: 10000（第 n 次重试等待 = intervalMs × intervalFactor^(n-1)，封顶 maxIntervalMs；未声明上限不封顶，最终仍受 100ms 下限与 maxElapsedMs 约束）。",
    "",
    "## 模式五：为校验失败与权限拒绝分别建场景",
    "",
    "同一业务功能的不同验证路径使用独立场景，不把参数校验、权限、边界值等互不依赖的失败分支塞进一个 failurePolicy: continue 场景。示例：",
    "",
    "    ScenarioTest.registerScenario(\"record-create-required-field\", ScenarioTest.defineScenario({",
    "        name: \"记录创建 / 缺少必填字段\", steps: [",
    "            { name: \"缺少必填字段时创建被拒绝\", method: \"POST\", path: \"<创建路径>\", request: { body: {} }, status: 400, assertions: [{ name: \"返回已确认错误码\", path: \"code\", equals: \"<错误码>\" }] }",
    "        ]",
    "    }));",
    "",
    "    ScenarioTest.registerScenario(\"record-create-unauthorized\", ScenarioTest.defineScenario({",
    "        name: \"记录创建 / 未认证拒绝\", steps: [",
    "            { name: \"未认证时创建被拒绝\", method: \"POST\", path: \"<创建路径>\", request: { body: { \"<已确认字段名>\": \"<已确认合法值>\" } }, status: 401 }",
    "        ]",
    "    }));",
    "",
    "状态码和业务错误码必须来自真实代码或文档。错误响应体没有证据时只断言 HTTP status，不断言 code、message、error 等字段。failurePolicy: continue 只用于同一验证路径中需要继续收集的步骤失败，不能用来合并不同场景。",
    "",
    "## 给 AI 的最小输入",
    "",
    "AI 无法定位接口时，提供 Controller 文件路径、OpenAPI 导出、前端 API 模块路径、已有请求响应样例、认证接口样例或测试变量名中的任一项。不要提供生产凭据或个人数据。"
].join("\n");

export function createProjectFiles(directory = "scenario-test", options = {}) {
    const storagePrefix = options.storagePrefix || "scenario-test.project";
    // 项目 .scenario-test/ 保存 AI 规则、模式库与运行时副本（由 init/安装脚本落盘）
    const frameworkPrefix = `${directory}/.scenario-test`;
    const frameworkDisplay = `.scenario-test/`;
    const authoringPromptPath = `${frameworkPrefix}/AI_SCENARIO_PROMPT.md`;
    return {
        [`${directory}/index.html`]: `<!doctype html>
<html lang="zh-CN">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>场景测试</title>
</head>
<body style="margin:0">
    <div id="scenario-test" style="height:100vh"></div>
    <!-- 运行时为项目内副本 .scenario-test/scenario-test.umd.js（init 落盘，离线可用）；接口通过 serve 代理访问 -->
    <script src="./.scenario-test/scenario-test.umd.js"></script>
    <script src="./scenario.config.js"></script>
    <script>
        ScenarioTest.createApp({ mount: "#scenario-test", config: ScenarioTest.getConfig() });
    </script>
</body>
</html>
`,
        [`${directory}/start-scenario-test.cmd`]: `@echo off
setlocal
cd /d "%~dp0"

rem Ask Windows for a random free loopback port so projects can run together.
for /f "usebackq delims=" %%P in (\`powershell.exe -NoProfile -Command "$listener=[System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback,0); $listener.Start(); $port=($listener.LocalEndpoint).Port; $listener.Stop(); Write-Output $port"\`) do set "SCENARIO_TEST_PORT=%%P"
if not defined SCENARIO_TEST_PORT (
    echo Scenario Test failed to allocate a free port.
    exit /b 1
)

set "SCENARIO_TEST_URL=http://127.0.0.1:%SCENARIO_TEST_PORT%/"
start "" powershell.exe -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Milliseconds 700; Start-Process '%SCENARIO_TEST_URL%'"
call node "%~dp0.scenario-test\\scenario-test-cli.cjs" serve --config "%~dp0scenario.config.js" --port %SCENARIO_TEST_PORT%

if errorlevel 1 (
    echo.
    echo Scenario Test failed to start. Run init first to generate runtime files.
    pause
)
`,
        [`${directory}/scenario.config.js`]: `/// <reference path="./.scenario-test/scenario-test.d.ts" />
ScenarioTest.registerConfig(ScenarioTest.defineConfig({
    envs: [
        {
            key: "local",
            name: "本地开发",
            baseUrl: "http://localhost:8080",
            // 未确认前保持为空；按真实项目需要添加 header / cookie / query
            globals: []
        }
    ],
    defaultEnvKey: "local",
    storagePrefix: ${JSON.stringify(storagePrefix)},
    requestTimeoutMs: 30000,
    vars: {},
    variables: [],
    scenarios: []
}));
`,
        [`${frameworkPrefix}/AI_SCENARIO_PROMPT.md`]: AUTHORING_PROMPT,
        [`${frameworkPrefix}/SCENARIO_PATTERNS.md`]: SCENARIO_PATTERNS,
        [`${directory}/README.md`]: `# 场景测试

本目录是当前项目的场景测试入口。它与业务代码同仓维护：环境地址、测试变量、场景文件和项目专属插件放在这里；浏览器工作台与 CLI 由 @yc_yzkj/scenario-test 提供（运行时副本在 \`${frameworkDisplay}\`，由 init 或安装脚本落盘）。

默认免 npm 接入：不安装 npm 包、不改 package.json，直接使用 \`${frameworkDisplay}\` 内的运行时副本（仍需 Node.js 18+）。偏好包管理的团队可显式选择 npm 模式（\`npm install -D @yc_yzkj/scenario-test\` + \`npx @yc_yzkj/scenario-test\`）；两种方式不混用、不自动切换。项目内 \`${frameworkDisplay}\` 保存 AI 规则、模式库与运行时副本（CLI、UMD、d.ts、能力清单），业务人员通常不需要打开或修改。

## 开始使用

如果安装会话还在继续，直接回答 AI 提出的业务功能问题即可；AI 已读取本目录的规则，不需要再次复制任何 Prompt。

如果新开了 AI 会话，只需输入：

\`\`\`text
请读取 ${authoringPromptPath}，为“<业务功能名称>”设计场景测试。入口：<页面、Controller、接口或已有测试路径>。
\`\`\`

接下来：

1. AI 先输出功能卡片和场景矩阵；用户只需确认业务规则，并在 AI 询问时提供环境地址、安全测试账号、Token、枚举值或测试数据。
2. AI 负责维护 \`scenario.config.js\` 和 \`scenarios/\`。一次只处理一个业务功能，不扫描整个项目批量生成。
3. AI 给出命令后，再逐个调试该功能下的场景。初始场景清单为空时不要运行 \`--all\`。

## 目录说明

| 路径 | 作用 | 是否应修改 |
| --- | --- | --- |
| \`index.html\` | 浏览器工作台入口 | 通常不需要 |
| \`start-scenario-test.cmd\` | Windows 人工测试入口；双击后启动 HTTP Server 并打开工作台 | 通常不需要 |
| \`scenario.config.js\` | 环境、测试变量和场景清单；通常由 AI 按用户提供的信息维护 | 按需 |
| \`scenarios/\` | 按业务功能建子目录；目录内一个文件对应该功能的一条独立验证路径 | 由 AI 维护 |
| \`plugins/\` | 仅当前项目需要的文件、Excel 或业务扩展 | 按需新建 |
| \`${frameworkDisplay}\` | AI 规则、模式库与运行时副本（CLI/UMD/d.ts/能力清单） | 不需要用户修改 |

## 配置环境和变量

\`scenario.config.js\` 只有五个核心概念：

- \`envs\`：环境名称和接口基础地址。每个环境必须有唯一的 \`key\`；可声明环境级 \`vars\`，同一份配置切换环境即可换租户/账号。
- \`globals\`：全局参数，追加到每个请求。支持 ${GLOBALS_TYPES_BACKTICK} 三种类型，可配置在顶层（所有环境生效）或单个环境内。值支持 \`{{vars.xxx}}\` 模板；步骤显式声明的同名参数优先于全局参数。CLI 可用 \`SCENARIO_GLOBALS\` 环境变量（JSON 数组）覆盖，如 \`[{"type":"header","name":"Authorization","value":"Bearer x"}]\`。
- \`vars\`：本项目启动时使用的默认变量。私有项目可在这里保存团队联调 Key、Secret、Token、测试账号等。
- \`variables\`：页面上需要展示或允许覆盖的变量元数据，包括标签、是否必填，以及可选的 CLI 环境变量名。实际默认值优先写在 \`vars\`，不要重复维护。
- \`scenarios\`：场景 id、名称和对应 JS 文件地址。需要人工前置条件或写数据的场景可加 \`manual: true\`：\`--all\` 默认排除，\`--scenario <id>\` 可显式执行。可加 \`tags: ["smoke"]\`，用 \`run --tag smoke\` 筛选执行（重复参数 OR，逗号分隔 AND；不会自动放行 manual 场景）。

最小配置示例：

\`\`\`js
ScenarioTest.registerConfig(ScenarioTest.defineConfig({
    globals: [
        { type: "header", name: "X-Project", value: "project-test" }
    ],
    envs: [
        { key: "local", name: "本地开发", baseUrl: "http://localhost:8080" },
        { key: "test", name: "测试环境", baseUrl: "https://test.example.com" }
    ],
    defaultEnvKey: "local",
    requestTimeoutMs: 30000,
    vars: {
        clientId: "project-test-client",
        clientSecret: "replace-with-private-value"
    },
    variables: [
        { name: "clientId", label: "客户端 ID", required: true },
        { name: "clientSecret", label: "客户端密钥", required: true, env: "SCENARIO_CLIENT_SECRET" }
    ],
    scenarios: [
        { id: "order-create-success", name: "订单创建 / 成功", url: "scenarios/order-create/success.js" },
        { id: "order-create-required-field", name: "订单创建 / 缺少必填字段", url: "scenarios/order-create/required-field.js" }
    ]
}));
\`\`\`

变量优先级固定如下：

\`CLI 环境变量 / 浏览器页面覆盖 > --vars > 选中环境 envs[].vars > scenario.config.js 的 vars > 场景 vars > variables[].defaultValue\`

浏览器中保存的变量会按项目 \`storagePrefix\` 和环境保存到 LocalStorage；点击清除当前环境覆盖后，立即回退到 \`vars\`。CLI 只读取系统环境变量和配置文件，不读取浏览器 LocalStorage。 \`init\` 会根据项目目录名生成隔离前缀。

## 编写场景

先确定一个业务功能，再为它设计场景矩阵。业务功能是设计与目录边界，场景是该功能下的一条独立验证路径，例如成功、业务规则校验、权限拒绝、边界值、重复操作或状态流转。只生成有代码或文档依据的路径。

建议使用 \`scenarios/<功能标识>/<验证路径>.js\`，场景 id 使用 \`<功能标识>-<验证路径>\`，名称使用 \`功能名 / 验证路径\`。运行时仍使用扁平的 \`scenarios\` 清单，不需要新增功能分组字段。一个场景可以包含准备数据、执行目标操作、查询结果和精确清理等多个步骤，但这些步骤必须只服务于目标功能，不能把相邻业务功能串成一个大场景。每个场景必须独立运行，文件注册 id 与配置 id 保持一致。

下面是“订单创建”功能的成功场景；“缺少必填字段”“未认证拒绝”等应分别建立同功能下的其他场景文件：

\`\`\`js
ScenarioTest.registerScenario("order-create-success", ScenarioTest.defineScenario({
    name: "订单创建 / 成功",
    vars: { orderName: "scenario-{{vars.runNo}}" },
    steps: [
        {
            name: "创建订单",
            method: "POST",
            path: "api/orders",
            request: {
                headers: { Authorization: "Bearer {{vars.token}}" },
                body: { name: "{{vars.orderName}}" }
            },
            status: 201,
            extract: [{ name: "orderId", path: "data.id" }]
        },
        {
            name: "查询刚创建的订单",
            method: "GET",
            path: "api/orders/{{vars.orderId}}",
            status: 200,
            assertions: [
                { path: "data.name", equals: "{{vars.orderName}}" }
            ]
        }
    ]
}));
\`\`\`

写操作使用可识别的测试标记，并只按本场景刚创建或提取到的 ID 精确清理。不同验证目标应拆成同一功能下的独立场景，不通过 \`failurePolicy: "continue"\` 把无关失败分支合并起来。

常用能力：

- 用 \`{{vars.name}}\` 在 path、Query、Header、Body 中引用变量。
- 用 \`extract\` 从响应提取 ID、Token 或状态，再供后续步骤使用；路径必填时加 \`required: true\`，缺失会失败，默认缺失只产生 warning；可选字段可声明 \`default\` 兜底值（与 required 互斥）。数组下标支持负数取倒数项（\`records[-1]\` 为末项）。路径支持通配段 \`[*]\`（\`items[*].id\` 逐元素提取为数组，空数组产 \`[]\`，非数组按缺失处理，连续通配展平为一级数组）。\`from: "headers"\` 配 \`path\` 时首段头名按大小写不敏感匹配（与断言 \`from: "headers"\`、\`header\` 简写同口径，任意大小写命中同一响应头），首段后的子路径在头值上取。
- 断言操作符：${OPERATORS_BACKTICK}；数值比较用 \`gte: 5\`，列表条数/字符串长度/对象键数用 \`length: N\`，非负整数等格式校验用 \`matches: "^\\\\d+$"\`，接口耗时上限用 \`{ target: "duration", lte: 800 }\`（毫秒）。
- 登录、换 Token、签名都按普通步骤和变量实现；浏览器 Cookie 会话显式使用 \`request.credentials: "include"\`，CLI 需要自动维持会话时可加 \`run --cookie-jar\`（单场景内存 Jar，不落盘、不跨场景）。
- 每一步至少写 \`name\`、\`method\`、\`path\`、\`status\`；关键结果补充 \`assertions\`。
- 未写 \`status\` 和 \`assertions\` 时运行时默认要求 HTTP 2xx，不能把异常响应当成功。
- 最终一致性使用 \`retryUntil\`，避免固定等待；服务/容器刚启动、首次轮询可能连接失败时用 \`retryOn: ["assertion", "error", "timeout"]\` 让网络错误与单次超时继续轮询（默认 \`["assertion"]\`），非幂等写操作开启前先确认安全；长轮询需要指数退避时用 \`intervalFactor\`（≥1，默认 1 = 固定间隔，第 n 次重试等待 = intervalMs × intervalFactor^(n-1)）与 \`maxIntervalMs\`（单次等待上限，≥intervalMs），未声明上限不封顶，最终仍受 100ms 下限与 \`maxElapsedMs\` 约束；前置变量可能为空的删除操作使用 \`when\` 保护（\`when\` 对象形式支持 \`from: "vars"\` / \`from: "lastResponse"\` / \`from: "status"\`，或用 \`target: "status"\` 读取上一步状态码）。
- \`runId\` / \`runNo\` 是运行时保留变量，禁止在配置或场景中声明或覆盖。
- 默认失败即停止；只有同一验证路径确实需要继续收集后续步骤结果时，才在场景上设 \`failurePolicy: "continue"\`。
- SKIP 步骤不计入通过/执行统计，全跳过时场景状态为 SKIPPED；写数据类场景在配置清单中加 \`manual: true\`，\`--all\` 会默认排除，需用 \`--scenario <id>\` 显式执行。

完整 DSL 与示例见公共库 README；项目内新增用例由 AI 读取 \`${frameworkDisplay}AI_SCENARIO_PROMPT.md\` 和同目录的模式库后生成。

## 浏览器工作台

双击本目录中的 \`start-scenario-test.cmd\` 启动工作台：脚本使用项目内运行时副本启动本地 HTTP Server，自动打开 \`index.html\`。\`serve\` 会在页面中启用同源代理模式，浏览器请求先发送到当前工作台地址，再转发到所选环境的 \`baseUrl\`，无需后端放行 CORS，也无需手工清空或覆盖页面地址。人工测试结束后按 \`Ctrl+C\` 停止服务。

也可以在项目根目录执行：

\`\`\`powershell
.\\scenario-test\\start-scenario-test.cmd
\`\`\`

不要直接双击 \`index.html\`：页面虽可加载，但接口请求会被浏览器 CORS 拦截，必须通过 \`serve\` 的同源代理执行。

## CLI 执行

默认使用项目内运行时副本（免 npm 模式），无需安装 npm 包。偏好 npm 的团队可先 \`npm install -D @yc_yzkj/scenario-test\`，把 \`node ${frameworkDisplay}scenario-test-cli.cjs\` 换成 \`npx @yc_yzkj/scenario-test\` 即 npm 模式，其余参数一致。执行配置中全部场景：

\`\`\`powershell
node ${frameworkDisplay}scenario-test-cli.cjs run --config ${directory}/scenario.config.js --env local --all
\`\`\`

执行单个场景时，使用配置中的场景 id（命令 \`run\` 紧跟脚本名）：

\`\`\`powershell
node ${frameworkDisplay}scenario-test-cli.cjs run --config ${directory}/scenario.config.js --env local --scenario order-create-success
\`\`\`

在 PowerShell 中为一次执行临时覆盖凭据：

\`\`\`powershell
$env:SCENARIO_CLIENT_SECRET = "temporary-value"
node ${frameworkDisplay}scenario-test-cli.cjs run --config ${directory}/scenario.config.js --env local --all
Remove-Item Env:SCENARIO_CLIENT_SECRET
\`\`\`

前提是变量定义中声明了 \`env: "SCENARIO_CLIENT_SECRET"\`。CLI 参数以当前版本的 \`--help\` 输出为准。

临时覆盖配置变量或请求超时，无需修改配置文件：

\`\`\`powershell
node ${frameworkDisplay}scenario-test-cli.cjs run --config ${directory}/scenario.config.js --env local \`
  --vars clientId=temporary-client \`
  --vars "clientSecret={{vars.defaultSecret}}" \`
  --timeout 5000 --all
\`\`\`

\`--vars key=value\` 可重复，按出现顺序叠加（同名后者覆盖），优先级高于配置 \`vars\` 与环境变量，值中的 \`{{ }}\` 模板照常解析；\`--timeout <ms>\` 覆盖配置 \`requestTimeoutMs\`。\`runId\` / \`runNo\` 是保留变量，不能用 \`--vars\` 覆盖。

常用批量与 CI 选项：\`--tag smoke\`（按标签筛选）、\`--bail\`（首个失败场景后停止）、\`--data <json|jsonl|csv>\`（按行变量集执行）、\`--junit <file>\`（JUnit XML 报告）、\`--cookie-jar\`（单场景内存 Cookie 会话）。\`serve --proxy-timeout <ms>\` 可调大同源代理的上游空闲超时（默认 30 秒，上限 10 分钟）。

## 常见问题

### 页面提示 ScenarioTest 未定义或脚本加载失败

确认项目 \`${frameworkDisplay}\` 中存在 \`scenario-test.umd.js\`（运行时副本，由 init/安装脚本落盘）；\`index.html\` 加载的是 \`./.scenario-test/scenario-test.umd.js\`。文件缺失时重跑安装脚本（或带 \`--library-url\` 的 init）补齐，再通过 \`start-scenario-test.cmd\` 启动工作台。

### 页面能打开但场景没有加载

通过 \`start-scenario-test.cmd\` 启动工作台，不要从 \`file:///\` 直接打开页面；再检查 \`scenario.config.js\` 的场景 \`id\`、\`url\` 与场景文件里的 \`registerScenario(id, ...)\` 是否一致。

### CLI 的变量和页面不一致

这是预期行为：页面读取浏览器当前环境的 LocalStorage 覆盖；CLI 不读取它。需要在 CLI 临时替换值时，为 \`variables\` 配置 \`env\` 并设置对应系统环境变量。

### 新业务功能不知道如何设计场景

不要先扫描整个项目或按接口批量建文件。先选定一个业务功能，并把功能名称及可定位的页面、Controller、OpenAPI 节点、前端 API 模块或已有测试入口交给 AI；AI 会读取 \`${frameworkDisplay}\` 中的项目规则，先输出功能卡片和场景矩阵。没有依据的业务规则、接口和字段列为待确认项。

## 升级运行时

场景、配置和项目插件属于本项目，升级时不要覆盖它们。使用新版 CLI 对当前目录执行 \`init\`（npm 模式先升级包；免 npm 模式把下载源切换到新的固定版本后重跑安装脚本）；CLI 会刷新 \`${frameworkDisplay}\` 中的 AI 规则与运行时副本，不覆盖项目配置与场景。升级后先运行 doctor 和一个代表性业务场景，再提交本项目改动。

公共运行时不保存业务地址、账号、Token、Secret 或测试数据；这些仅能放在当前私有项目的配置和受控环境变量中。
`
    };
}

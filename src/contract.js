// scenario-test DSL Contract —— 三方能力发现的唯一事实来源
//
// 本模块是运行时（core/registry/engine/cli）与对外投影
// （capabilities 命令、dist/scenario-test-capabilities.json、scenario-test.d.ts、
//  init 生成的 AI Prompt / Patterns / README、doctor AI 规则检查）共同消费的
// 机器可读契约。README / AI Prompt 只能描述 contract，不能反向驱动代码。
//
// 规则：
//   - contract 一旦发布即不可变；新增能力时递增 contractVersion 并保留旧字段。
//   - 不要在本模块手写 runtime 版本，统一复用 version.generated.js 的 VERSION。
import { VERSION } from "./version.generated.js";

export const CONTRACT_VERSION = 13;

export const contract = Object.freeze({
    contractVersion: CONTRACT_VERSION,
    runtimeVersion: VERSION,

    // 运行时要求（与 package.json engines 保持一致，doctor 据此校验 Node 版本）
    engines: Object.freeze({ node: ">=18" }),

    assertions: Object.freeze({
        // 断言对象允许的元数据键（非操作符键）
        metaKeys: Object.freeze(["name", "path", "from", "target", "header", "implicit"]),
        // 断言目标 target 的取值：status=HTTP 状态码，duration=本次请求耗时（毫秒，引擎挂载在 response.durationMs）
        targets: Object.freeze(["status", "duration"]),
        // 断言数据来源 from 的取值（缺省按 body 取值）
        from: Object.freeze(["body", "vars", "headers", "bodyText"]),
        // from:"headers" 配 path 时首段按 HTTP 头名大小写不敏感匹配（HTTP 头名不区分大小写，
        // HTTP/2 响应头全小写），与 header 简写、extract 的 from:"headers" 同口径；
        // 首段之后的子路径在头值上取，from:"response" 与模板 lastResponse.headers.* 仍按精确键匹配
        note: "from: \"headers\" 配 path 时首段头名大小写不敏感匹配（与 header 简写、extract 同口径）；首段后的子路径在头值上取，from: \"response\" 与模板 lastResponse.headers.* 仍按精确键匹配",
        // 断言操作符：键为操作符名；valueType 描述期望值类型约束，
        // finiteNumber 表示实际值与期望值都必须是有限 number（不做字符串隐式转换）
        operators: Object.freeze({
            exists: Object.freeze({
                description: "字段存在且非 null/空串（exists: true），或不存在（exists: false）",
                valueType: "boolean"
            }),
            equals: Object.freeze({
                description: "实际值与期望值 JSON 深比较相等",
                valueType: "any"
            }),
            notEquals: Object.freeze({
                description: "实际值与期望值 JSON 深比较后取反",
                valueType: "any"
            }),
            includes: Object.freeze({
                description: "数组包含期望项，或字符串包含期望子串",
                valueType: "any"
            }),
            each: Object.freeze({
                description: "数组逐项断言：实际值必须是数组，expected 为子断言定义对象或其数组，对每个元素套用子断言（子断言 path 相对元素自身，期望值支持模板变量）；任一元素任一子断言失败则整体失败，空数组恒通过，非数组实际值直接失败",
                valueType: "assertion"
            }),
            shape: Object.freeze({
                description: "结构级校验（jsonSchema-lite）：按 type/required/properties/items/enum/additionalProperties 校验响应结构，失败明细定位到字段路径与期望/实际类型",
                valueType: "any"
            }),
            matches: Object.freeze({
                description: "正则表达式匹配字符串化后的实际值",
                valueType: "string"
            }),
            oneOf: Object.freeze({
                description: "实际值属于期望候选数组之一（深比较）",
                valueType: "array"
            }),
            startsWith: Object.freeze({
                description: "字符串化后的实际值以期望值开头（大小写敏感；null/undefined 实际值视为空串）",
                valueType: "string"
            }),
            endsWith: Object.freeze({
                description: "字符串化后的实际值以期望值结尾（大小写敏感；null/undefined 实际值视为空串）",
                valueType: "string"
            }),
            length: Object.freeze({
                description: "数组元素个数 / 字符串字符数 / 对象键数等于期望值；非容器类型（number/boolean/null）直接失败",
                valueType: "finiteNumber"
            }),
            gt: Object.freeze({
                description: "实际值大于期望值",
                valueType: "finiteNumber"
            }),
            gte: Object.freeze({
                description: "实际值大于等于期望值",
                valueType: "finiteNumber"
            }),
            lt: Object.freeze({
                description: "实际值小于期望值",
                valueType: "finiteNumber"
            }),
            lte: Object.freeze({
                description: "实际值小于等于期望值",
                valueType: "finiteNumber"
            })
        }),
        // 只接受有限 number 的操作符（与 operators 中 valueType: "finiteNumber" 一致）
        numericOperators: Object.freeze(["gt", "gte", "lt", "lte"]),
        // shape 断言支持的结构键与类型名（jsonSchema-lite，不引入依赖）
        shape: Object.freeze({
            keys: Object.freeze(["type", "required", "properties", "items", "enum", "additionalProperties"]),
            types: Object.freeze(["object", "array", "string", "number", "integer", "boolean", "null"])
        })
    }),

    when: Object.freeze({
        // when 对象形式的来源：vars=已提取变量；lastResponse=上一步响应 body（path 子路径取值口径同 extract from:"body"）；status=上一步 HTTP 状态码（数值）
        sources: Object.freeze(["vars", "lastResponse", "status"]),
        // when 对象形式也可用 target 读取上一步响应级通道，目前仅 status（与断言 target 白名单的 status 对齐）
        targets: Object.freeze(["status"]),
        note: "when 对象形式支持 from: vars / lastResponse / status（lastResponse 取上一步响应 body，status 取上一步 HTTP 状态码），也可用 target: \"status\" 读取上一步状态码；第一步无上一步响应时按来源缺失处理、条件不成立，不中断场景。非对象形式（模板字符串/布尔）保持真值语义"
    }),

    extract: Object.freeze({
        // extract 项允许的键（与断言 metaKeys 同思路：未识别键定义期即拒，
        // 防止 heder/fromm 等拼错静默落到默认 body 来源）
        metaKeys: Object.freeze(["name", "path", "from", "target", "header", "required", "default", "scope"]),
        // 提取作用域：step（默认，仅当前场景可见）/ suite（写入本次 run 的共享变量，后续场景可引用）
        scopes: Object.freeze(["step", "suite"]),
        // extract 支持的来源（默认 body）
        // from:"headers" 配 path 时首段头名按大小写不敏感匹配（与断言 from:"headers"、header 简写同口径）；
        // 首段之后的子路径在头值上取，from:"response" 仍按精确键匹配
        from: Object.freeze(["body", "headers", "bodyText", "response"]),
        // extract 支持的目标（与断言 targets 的子集：status=HTTP 状态码）
        targets: Object.freeze(["status"]),
        // required 语义：路径不存在时 required: true 使当前步骤失败，默认缺失产生 warning
        required: "boolean",
        // default 语义：路径不存在时取声明的兜底值（支持模板），与 required 互斥
        default: "any",
        note: "required: true 且路径不存在时当前步骤失败；声明 default 时缺失取兜底值（支持模板、不产生 warning）；否则缺失产生 warning（不含响应内容），变量为 undefined；required 与 default 互斥，只能声明其一；from: \"headers\" 配 path 时首段头名大小写不敏感匹配（与断言 from: \"headers\"、header 简写同口径），首段后的子路径在头值上取，from: \"response\" 仍按精确键匹配；scope: \"suite\" 时提取值写入本次 run 共享变量，后续场景可直接用 {{vars.<name>}} 引用（默认 step 仅当前场景可见）"
    }),

    // 运行时自动生成的保留变量：禁止在 vars/envVars/generatedVars/extract 中声明或覆盖。
    // __proto__/constructor/prototype 为原型链安全键：声明同名变量会触发对象原型
    // 改写（写入）或取到继承成员（读取），使断言结果被污染，一并禁止
    reservedVars: Object.freeze(["runId", "runNo", "__proto__", "constructor", "prototype"]),

    generatedVars: Object.freeze({
        types: Object.freeze(["timestamp", "uuidHex", "md5", "signature", "idcard", "luhn", "phone", "uscc", "uuid", "enum"]),
        note: "证件/卡号/号码类测试造数（顺序码与中间数字均由 runId 与变量名确定性派生：每轮变化、轮内不同名变量互异，撞业务唯一约束时重跑即换号）。"
            + " idcard：中国大陆 18 位身份证号，birthDate 必填（YYYY-MM-DD 合法日历日期）、gender 可选（MALE/FEMALE，默认 MALE）、regionCode 可选（6 位数字，缺省从真实测试区划池按轮次派生），校验位按 GB 11643 计算。"
            + " luhn：银行卡号，length 可选（12-19，默认 16）、prefix 可选（数字卡头，默认 62），末位按 Luhn 算法校验。"
            + " phone：大陆手机号（1[3-9] 开头 11 位），prefix 可选（3 位号段，缺省从测试号段池按轮次派生）。"
            + " uscc：统一社会信用代码（18 位），regionCode 可选（6 位数字，默认 110100），登记管理/机构类别固定 91（企业法人），校验位按 GB 32100-2015 计算。"
            + " timestamp：可选 offset（相对当前时间的偏移，如 -7d/+8d/30m，数字+单位 ms/s/m/h/d/w）、unit（ms 默认/s，数值粒度）或 format（本地时间 token 组合 YYYY/MM/DD/HH/mm/ss，如 YYYY-MM-DD HH:mm:ss，输出字符串，与 unit 互斥），时间窗与过期类参数无需外部拼值。"
            + " uuid：带连字符 UUID v4（uuidHex 为 32 位无连字符十六进制），适配以 UUID 为业务主键的接口。"
            + " enum：从 values 候选集中按 weights（可选非负数字，缺省等权，权重为 0 者永不被选中）确定性抽取一个值——按 runId 与变量名派生，轮内稳定、跨轮变化，适配渠道/状态等枚举类参数需要随机但可复现的场景"
    }),

    globals: Object.freeze({
        // 全局参数类型：追加到每个请求的 header / cookie / query
        types: Object.freeze(["header", "cookie", "query"]),
        note: "全局参数支持 header / cookie / query 三种类型，步骤显式声明或 URL 已有同名参数优先"
    }),

    config: Object.freeze({
        // 配置中 scenarios 清单项的字段（file/path 为 url 的兼容回退，不写入契约字段）
        scenarioItemKeys: Object.freeze(["id", "name", "url", "manual", "tags"]),
        environmentKeys: Object.freeze(["key", "name", "baseUrl", "globals", "authorization", "vars"]),
        variableKeys: Object.freeze(["name", "label", "env", "required", "defaultValue"]),
        manual: Object.freeze({
            type: "boolean",
            note: "manual: true 表示场景需要人工准备数据或写数据，--all 默认排除，--scenario <id> 可显式执行"
        }),
        tags: Object.freeze({
            type: "string[]",
            note: "配置清单项声明 tags 用于 run --tag 筛选（重复参数之间为 OR，单个参数内逗号分隔为 AND；不会自动放行 manual:true 场景）；场景顶层 tags 为场景元数据"
        })
    }),

    scenario: Object.freeze({
        keys: Object.freeze(["name", "steps", "vars", "envVars", "generatedVars", "failurePolicy", "tags"]),
        stepKeys: Object.freeze([
            "name", "method", "path", "params", "request", "status",
            "assertions", "extract", "when", "retryUntil", "timeoutMs",
            "saveResponseAs", "adapter", "always"
        ]),
        failurePolicies: Object.freeze(["stop", "continue"]),
        // retryUntil 允许的键；intervalFactor/maxIntervalMs 控制指数退避
        retryUntilKeys: Object.freeze(["maxAttempts", "intervalMs", "maxElapsedMs", "intervalFactor", "maxIntervalMs"]),
        note: "always: true 的步骤在前置普通步骤失败（failurePolicy: stop）后仍会执行，用于 teardown；用户取消执行时不运行。retryUntil 第 n 次重试间隔 = intervalMs * intervalFactor^(n-1)，封顶 maxIntervalMs，且不低于 100ms"
    }),

    cli: Object.freeze({
        commands: Object.freeze(["run", "serve", "init", "capabilities", "doctor"]),
        options: Object.freeze({
            config: { kind: "value", prop: "config", description: "场景配置文件" },
            env: { kind: "value", prop: "env", description: "配置中的环境 key" },
            "base-url": { kind: "value", prop: "baseUrl", description: "临时覆盖 Base URL" },
            scenario: { kind: "value", prop: "scenario", description: "执行指定场景（可执行 manual:true 场景）" },
            vars: {
                kind: "value",
                prop: "vars",
                parse: "keyValue",
                repeatable: true,
                description: "临时注入/覆盖配置变量（key=value，可重复；优先级最高，值支持 {{ }} 模板）"
            },
            timeout: { kind: "value", prop: "timeout", parse: "number", description: "本次执行全局请求超时（毫秒），覆盖配置 requestTimeoutMs" },
            "proxy-timeout": { kind: "value", prop: "proxyTimeout", parse: "number", description: "serve 代理上游空闲超时（毫秒，默认 30000，上限 600000）" },
            data: { kind: "value", prop: "dataFile", description: "数据驱动执行：JSON/JSONL/CSV 数据集文件，每行变量集执行一次场景" },
            junit: { kind: "value", prop: "junit", description: "输出 JUnit XML 报告到指定文件" },
            tag: {
                kind: "value",
                prop: "tags",
                repeatable: true,
                description: "按标签筛选场景（可重复；重复参数之间为 OR，单个参数内逗号分隔为 AND）"
            },
            bail: { kind: "flag", prop: "bail", description: "任一场景失败后不再启动后续场景（已执行场景跑完）" },
            "cookie-jar": { kind: "flag", prop: "cookieJar", description: "run 为每个场景启用内存 Cookie Jar（自动携带 Set-Cookie，默认关闭）" },
            port: { kind: "value", prop: "port", parse: "number", description: "浏览器服务端口，默认 4300" },
            project: { kind: "value", prop: "project", description: "init 目标项目根目录" },
            dir: { kind: "value", prop: "dir", description: "init 场景测试目录名" },
            "library-url": { kind: "value", prop: "libraryUrl", description: "init 运行时副本下载目录（CLI/UMD/d.ts/capabilities，默认 GitHub Tag dist）" },
            all: { kind: "flag", prop: "all", description: "执行配置中的全部自动场景（默认排除 manual:true）" },
            force: { kind: "flag", prop: "force", description: "init 覆盖已有文件（目标目录已存在时可交互选择）" },
            "no-input": { kind: "flag", prop: "noInput", description: "init 非交互：目录已存在时按 keep（保留配置与场景，仅刷新 AI 规则和运行时副本）" },
            "fail-on-skip": { kind: "flag", prop: "failOnSkip", description: "存在任何 SKIP 步骤时最终退出码为 1" },
            "allow-external-plugins": { kind: "flag", prop: "allowExternalPlugins", description: "允许加载外部插件（有安全风险）" },
            json: { kind: "flag", prop: "json", description: "run/capabilities/doctor 输出机器可读 JSON（stdout 纯净，人类可读进度与结论走 stderr）" },
            token: {
                kind: "value", prop: "authorization",
                aliases: ["authorization"],
                description: "（已弃用）命令行传递授权令牌；推荐 SCENARIO_AUTH 环境变量"
            }
        })
    })
});
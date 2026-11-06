// 变异体定义（单独文件，方便人工复核与机器消费）。
//
// 每个变异体的约束：
//   - file + find/replace：find 必须在文件中「恰好出现 1 次」，脚本会强制校验，
//     命中 0 次或多次一律拒绝注入（避免误伤多处代码）；
//   - testFile + testName：判定只看这唯一用例，且必须由 pass 转 fail 才算 killed；
//   - expect：killed（应被捕获）/ survived（已知未覆盖，如实记录）/ equivalent（等价变异）。
//
// 注意：find/replace 里的 \n 是 JS 转义，运行时表示真实换行，用于跨行片段定位。
//
// 平台门控：变异体可用 platforms 声明适用平台（如 platforms: ["linux"]）。未声明 = 全平台适用；
// 声明后当前平台不在其中 → runner 记 outcome=excluded（platform-not-applicable），显式给出原因，
// 不计入 killed/survived/equivalent，也不进本机得分分母；CI 仍须在声明平台上实际执行。
// M50 依赖 C13 的 PATH 观测桩（仅 Linux 可靠），因此声明 platforms: ["linux"]；
// Windows/macOS 上它是明确的「平台不适用」，不再伪装成 survived 覆盖缺口。

export const mutations = [
    // ===== 断言操作符 =====
    {
        id: "M01",
        description: "gt 由严格大于改成 >=（比较符边界退化）",
        file: "src/core.js",
        find: 'if (op === "gt") passed = passed && actual > expected;',
        replace: 'if (op === "gt") passed = passed && actual >= expected;',
        testFile: "tests/comprehensive-core.test.js",
        testName: "A1 数值比较符在边界上取等/不取等",
        expect: "killed"
    },
    {
        id: "M02",
        description: "lte 由 <= 改成 <（比较符边界退化）",
        file: "src/core.js",
        find: "else passed = passed && actual <= expected;",
        replace: "else passed = passed && actual < expected;",
        testFile: "tests/comprehensive-core.test.js",
        testName: "A1 数值比较符在边界上取等/不取等",
        expect: "killed"
    },
    {
        id: "M03",
        description: "数值比较恢复隐式类型转换（去掉有限 number 校验）",
        file: "src/core.js",
        find: 'const comparable = typeof actual === "number" && Number.isFinite(actual)',
        replace: "const comparable = actual !== undefined && actual !== null",
        testFile: "tests/comprehensive-core.test.js",
        testName: "A1 数值比较符不做字符串隐式转换",
        expect: "killed"
    },
    {
        id: "M04",
        description: "length 对字符串按 UTF-8 字节数而非字符数计数",
        file: "src/core.js",
        find: ': (typeof actual === "string" ? actual.length',
        replace: ': (typeof actual === "string" ? Buffer.from(actual).length',
        testFile: "tests/comprehensive-core.test.js",
        testName: "A2 length 单独使用",
        expect: "killed"
    },
    {
        id: "M05",
        description: "length 组合断言的 diff 证据改用回写后的长度（证据污染）",
        file: "src/core.js",
        find: "diff = assertionDiff({ [op]: comparison }, comparison, comparisonActual);",
        replace: "diff = assertionDiff({ [op]: comparison }, comparison, actual);",
        testFile: "tests/comprehensive-core.test.js",
        testName: "A2 length 与 equals 组合：length 通过但 equals 失败",
        expect: "killed"
    },
    {
        id: "M06",
        description: "shape 的 integer 不再拒绝小数",
        file: "src/core.js",
        find: 'if (type === "integer") return typeof value === "number" && Number.isInteger(value);',
        replace: 'if (type === "integer") return typeof value === "number" && Number.isFinite(value);',
        testFile: "tests/comprehensive-core.test.js",
        testName: "A3 shape：integer 拒绝小数",
        expect: "killed"
    },
    {
        id: "M07",
        description: "extract 的 required:true 被忽略（缺失不再失败）",
        file: "src/core.js",
        find: "if (definition.required === true) {",
        replace: "if (definition.required === false) {",
        testFile: "tests/comprehensive-core.test.js",
        testName: "A4 extract required:true 路径缺失使步骤失败",
        expect: "killed"
    },
    {
        id: "M08",
        description: "extract 未开 required 的缺失告警被吞掉（静默通过）",
        file: "src/core.js",
        find: 'warnings.push(`提取变量 ${definition.name}：路径 ${definition.path || "(整个响应)"} 不存在',
        replace: 'void 0 && warnings.push(`提取变量 ${definition.name}：路径 ${definition.path || "(整个响应)"} 不存在',
        testFile: "tests/comprehensive-core.test.js",
        testName: "A4 extract 未开 required",
        expect: "killed"
    },
    {
        id: "M09",
        description: "extract 的 default 兜底失效（缺失仍写 undefined）",
        file: "src/core.js",
        find: 'store(definition.name, resolve(definition.default, runtime), definition.scope === "suite");',
        replace: 'store(definition.name, undefined, definition.scope === "suite");',
        testFile: "tests/comprehensive-core.test.js",
        testName: "A4 extract default 兜底",
        expect: "killed"
    },
    {
        id: "M10",
        description: "from:headers 的 path 首段改为大小写敏感（HTTP/2 全小写头名失效）",
        file: "src/core.js",
        find: "const matched = headerKey(headers, key);",
        replace: "const matched = Object.prototype.hasOwnProperty.call(headers, key) ? key : undefined;",
        testFile: "tests/comprehensive-core.test.js",
        testName: "A4 extract 来源优先级",
        expect: "killed"
    },
    {
        id: "M11",
        description: "通配段 [*] 不再跳过缺失子路径（把 undefined 收进数组）",
        file: "src/core.js",
        find: "if (result === undefined) continue;",
        replace: "if (result === undefined && false) continue;",
        testFile: "tests/comprehensive-core.test.js",
        testName: "A4 extract 通配段 [*]",
        expect: "killed"
    },
    {
        id: "M12",
        description: "extract scope:suite 退化为写当前场景 vars（跨场景共享失效）",
        file: "src/core.js",
        find: "if (suiteScope) storeSuite(name, value);",
        replace: "if (false) storeSuite(name, value);",
        testFile: "tests/comprehensive-core.test.js",
        testName: "A4 extract scope:suite",
        expect: "killed"
    },

    // ===== 引擎执行语义 =====
    {
        id: "M13",
        description: "retryUntil 默认 retryOn 由 ['assertion'] 改为包含 error",
        file: "src/contract.js",
        find: 'defaultRetryOn: Object.freeze(["assertion"]),',
        replace: 'defaultRetryOn: Object.freeze(["assertion", "error"]),',
        testFile: "tests/comprehensive-engine.test.js",
        testName: "B1 retryOn 缺省只重试断言失败",
        expect: "killed"
    },
    {
        id: "M14",
        description: "错误/超时重试分支不再受 retryOn 成员约束",
        file: "src/engine.js",
        find: "if (!retry || !retryOn.has(errorType) || attempt === totalAttempts) throw error;",
        replace: "if (!retry || attempt === totalAttempts) throw error;",
        testFile: "tests/comprehensive-engine.test.js",
        testName: "B1 retryOn 的成员判定生效",
        expect: "killed"
    },
    {
        id: "M41",
        description: "retryOn 缺省成员判定偏向 error（默认也重试网络错误）",
        file: "src/engine.js",
        find: "? contract.retryUntil.defaultRetryOn",
        replace: '? [...contract.retryUntil.defaultRetryOn, "error"]',
        testFile: "tests/comprehensive-engine.test.js",
        testName: "B1 retryOn 缺省只重试断言失败",
        expect: "killed"
    },
    {
        id: "M15",
        description: "等价变异体（只插入无副作用语句，不改变可观测行为）",
        file: "src/engine.js",
        find: "assertions = buildAssertions(step, lastExecution.response, runtime, { stepName: step.name });",
        replace: "assertions = buildAssertions(step, lastExecution.response, runtime, { stepName: step.name }); void 0;",
        testFile: "tests/comprehensive-engine.test.js",
        testName: "B1 重试成功后残留的失败断言",
        expect: "equivalent"
    },
    {
        id: "M16",
        description: "HTTP 请求超时链失效（timeoutMs 被置 0，慢请求挂死）",
        file: "src/engine.js",
        find: "const requestSignal = createRequestSignal(options.signal, timeoutMs);\n    fetchOptions.signal = requestSignal.signal;",
        replace: "const requestSignal = createRequestSignal(options.signal, 0);\n    fetchOptions.signal = requestSignal.signal;",
        testFile: "tests/comprehensive-engine.test.js",
        testName: "B2 单步骤 timeoutMs",
        expect: "killed"
    },
    {
        id: "M17",
        description: "用户取消被当作普通失败（cancelled 结构化标记丢失）",
        file: "src/engine.js",
        find: "const cancelled = Boolean(options.signal?.aborted);",
        replace: "const cancelled = false;",
        testFile: "tests/comprehensive-engine.test.js",
        testName: "B2 用户取消",
        expect: "killed"
    },
    {
        id: "M18",
        description: "always 步骤在普通步骤失败后被跳过（清理不执行）",
        file: "src/engine.js",
        find: "if (halted && step.always !== true) {",
        replace: "if (halted) {",
        testFile: "tests/comprehensive-engine.test.js",
        testName: "B3 always teardown",
        expect: "killed"
    },
    {
        id: "M19",
        description: "取消后仍补跑后续步骤（取消被降级为普通失败继续执行）",
        file: "src/engine.js",
        find: "if (!result.passed && scenario.failurePolicy !== \"continue\") halted = true;\n            if (runOptions.signal?.aborted) break;",
        replace: "if (!result.passed && scenario.failurePolicy !== \"continue\") halted = true;\n            if (false) break;",
        testFile: "tests/comprehensive-engine.test.js",
        testName: "B2 用户取消",
        expect: "killed"
    },
    {
        id: "M20",
        description: "when 条件恒真（SKIP 永不发生，条件步骤总会发请求）",
        file: "src/engine.js",
        find: "const shouldRun = evaluateWhen(step.when, runtime, { stepName: step.name });",
        replace: "const shouldRun = true;",
        testFile: "tests/comprehensive-engine.test.js",
        testName: "B4 when 为假时步骤 SKIP",
        expect: "killed"
    },

    // ===== 上传 / 下载 / 大小上限 =====
    {
        id: "M21",
        description: "上传路径校验失效（路径穿越被放行）",
        file: "src/node/io.js",
        find: "return validatePath(root, filePath);",
        replace: "return path.resolve(root, filePath);",
        testFile: "tests/comprehensive-engine.test.js",
        testName: "B5 fileUpload 越界与超限被拒绝",
        expect: "killed"
    },
    {
        id: "M22",
        description: "上传大小上限被忽略（maxUploadBytes 失效）",
        file: "src/node/io.js",
        find: "if (maxUploadBytes > 0 && stat.size > maxUploadBytes) {",
        replace: "if (false) {",
        testFile: "tests/comprehensive-engine.test.js",
        testName: "B5 fileUpload 越界与超限被拒绝",
        expect: "killed"
    },
    {
        id: "M23",
        description: "保存响应路径校验失效（可写出工作区）",
        file: "src/node/io.js",
        find: "return validatePath(root, relativePath);",
        replace: "return path.resolve(root, relativePath);",
        testFile: "tests/comprehensive-engine.test.js",
        testName: "B5 saveResponseAs 越界目标被拒绝",
        expect: "killed"
    },
    {
        id: "M28",
        description: "响应体上限被忽略（maxResponseBytes 失效）",
        file: "src/engine.js",
        find: "const maxResponseBytes = resolveMaxResponseBytes(options);",
        replace: "const maxResponseBytes = 0;",
        testFile: "tests/comprehensive-engine.test.js",
        testName: "B5 maxResponseBytes",
        expect: "killed"
    },

    // ===== Cookie Jar =====
    {
        id: "M24",
        description: "Secure cookie 在明文 HTTP 下也被发送",
        file: "src/engine.js",
        find: '&& (!cookie.secure || url.protocol === "https:"));',
        replace: ");",
        testFile: "tests/comprehensive-engine.test.js",
        testName: "B6 cookie jar",
        expect: "killed"
    },
    {
        id: "M25",
        description: "跨站 Domain cookie 校验失效（cookie 可被发给其他站点）",
        file: "src/engine.js",
        find: "if (!isCookieDomainAllowed(requestUrl.hostname, cookie.domain)) continue;",
        replace: "if (false) continue;",
        testFile: "tests/comprehensive-engine.test.js",
        testName: "B6 跨站 Domain cookie 不得进入 jar",
        expect: "killed"
    },
    {
        id: "M26",
        description: "Max-Age=0 不再清除 cookie（退出登录不生效）",
        file: "src/engine.js",
        find: "if (cookie.expiresAt > Date.now()) runtime.cookieJar.push(cookie);",
        replace: "runtime.cookieJar.push(cookie);",
        testFile: "tests/comprehensive-engine.test.js",
        testName: "B6 Max-Age=0 必须从 jar 中真正移除 cookie",
        expect: "killed"
    },
    {
        id: "M27",
        description: "显式 Cookie 头不再优先于 jar（同名覆盖失效）",
        file: "src/engine.js",
        find: ".filter((cookie) => !explicitNames.has(cookie.name.toLowerCase()))",
        replace: ".filter((cookie) => true)",
        testFile: "tests/comprehensive-engine.test.js",
        testName: "B6 cookie jar",
        expect: "killed"
    },

    // ===== 造数底座 =====
    {
        id: "M29",
        description: "GB11643 校验码表错位（身份证校验位不合法）",
        file: "src/core.js",
        // 校验码表第 0/1 项互换：只有余数 0/1 的号码会变，必须用「按余数独立复算」的断言才能稳定捕获
        find: 'const GB11643_CHECK_CODES = "10X98765432";',
        replace: 'const GB11643_CHECK_CODES = "01X98765432";',
        testFile: "tests/comprehensive-engine.test.js",
        testName: "B7 身份证 GB11643 校验码锚点",
        expect: "killed"
    },
    {
        id: "M30",
        description: "Luhn 折叠步骤丢失（造出的卡号不合法）",
        file: "src/core.js",
        find: "if (digit > 9) digit -= 9;",
        replace: "if (false) digit -= 9;",
        testFile: "tests/comprehensive-engine.test.js",
        testName: "B7 generatedVars 造数",
        expect: "killed"
    },

    // ===== CLI 集成 =====
    {
        id: "M31",
        description: "CLI 退出码不再反映失败（失败也退 0，CI 静默假绿）",
        file: "src/cli.js",
        find: "if (failedTotal) process.exitCode = 1;",
        replace: "if (failedTotal) process.exitCode = 0;",
        testFile: "tests/comprehensive-cli.test.js",
        testName: "C1 HTTP 500 且无断言",
        expect: "killed"
    },
    {
        id: "M32",
        description: "默认 2xx 隐式断言放宽为任意三位数（5xx 也判通过）",
        file: "src/core.js",
        find: 'target: "status", matches: "^2\\\\d\\\\d$", implicit: true',
        replace: 'target: "status", matches: "^\\\\d\\\\d\\\\d$", implicit: true',
        testFile: "tests/comprehensive-cli.test.js",
        testName: "C1 HTTP 500 且无断言",
        expect: "killed"
    },
    {
        id: "M33",
        description: "--bail 串行路径失效（失败后继续启动后续场景）",
        file: "src/cli.js",
        find: "if (!report.passed && args.bail) bailTriggered = true;\n            }\n        } else {",
        replace: "if (!report.passed && args.bail) bailTriggered = false;\n            }\n        } else {",
        testFile: "tests/comprehensive-cli.test.js",
        testName: "C4 --bail",
        expect: "killed"
    },
    {
        id: "M34",
        description: "--tag 的 AND 语义退化为 OR（逗号分隔被拆开）",
        file: "src/cli.js",
        find: "tagGroups.some((group) => group.every((tag) => (entry.tags || []).includes(tag))))",
        replace: "tagGroups.some((group) => group.some((tag) => (entry.tags || []).includes(tag))))",
        testFile: "tests/comprehensive-cli.test.js",
        testName: "C3 --tag",
        expect: "killed"
    },
    {
        id: "M35",
        description: "suite 上下文不再跨场景合并（跨场景共享失效）",
        file: "src/cli.js",
        find: "Object.assign(suiteContext, report.suite || {});",
        replace: "Object.assign({}, report.suite || {});",
        testFile: "tests/comprehensive-cli.test.js",
        testName: "C2 suite 作用域",
        expect: "killed"
    },
    {
        id: "M36",
        description: "输出层脱敏失效（敏感值原文进入 stdout/JSON）",
        file: "src/cli.js",
        find: "const safeReports = reports.map((report) => redactSecrets(report, secretList));",
        replace: "const safeReports = reports.map((report) => report);",
        testFile: "tests/comprehensive-cli.test.js",
        testName: "C7 脱敏：vars 中的敏感值",
        expect: "killed"
    },
    {
        id: "M37",
        description: "数据集行变量被丢弃（--data 行值不进入模板）",
        file: "src/cli.js",
        find: "baseOptions.vars = { ...baseVars, ...rowVars, ...(args.vars || {}) };",
        replace: "baseOptions.vars = { ...baseVars, ...(args.vars || {}) };",
        testFile: "tests/comprehensive-cli.test.js",
        testName: "C6 --data CSV",
        expect: "killed"
    },
    {
        id: "M38",
        description: "导入时敏感请求头不再转占位变量（密钥写入草稿）",
        file: "src/import.js",
        find: "const maskedHeaders = maskSensitiveHeaders(normalizeHeaders(request.headers));",
        replace: "const maskedHeaders = { headers: normalizeHeaders(request.headers), vars: {}, notices: [] };",
        testFile: "tests/comprehensive-cli.test.js",
        testName: "C9 import --har",
        expect: "killed"
    },
    {
        id: "M39",
        description: "项目登记不再复用已有条目（每次 ensure 都当新项目）",
        file: "src/project-registry.js",
        find: "const existing = registry.projects[key];",
        replace: "const existing = null;",
        testFile: "tests/comprehensive-cli.test.js",
        testName: "C10 projects",
        expect: "killed"
    },
    {
        id: "M40",
        description: "项目登记文件损坏时静默返回空清单（掩盖数据损坏）",
        file: "src/project-registry.js",
        find: "throw new Error(`项目登记文件不是合法 JSON：${file}`);",
        replace: "return emptyRegistry();",
        testFile: "tests/comprehensive-cli.test.js",
        testName: "C10 projects",
        expect: "killed"
    },

    // ===== G3 造数 md5 / signature =====
    {
        id: "M42",
        description: "signature 输出不再大写（大小写口径漂移）",
        file: "src/core.js",
        find: "return md5(pairs.join(\"&\")).toUpperCase();",
        replace: "return md5(pairs.join(\"&\"));",
        testFile: "tests/comprehensive-core.test.js",
        testName: "A5 signature：按 key 排序",
        expect: "killed"
    },
    {
        id: "M43",
        description: "signature 不再按 key 排序（拼装顺序取决于入参顺序）",
        file: "src/core.js",
        find: "const pairs = Object.keys(params || {}).sort().map(",
        replace: "const pairs = Object.keys(params || {}).map(",
        testFile: "tests/comprehensive-core.test.js",
        testName: "A5 signature：按 key 排序",
        expect: "killed"
    },
    {
        id: "M44",
        description: "md5 造数改用变量名而非变量值（parts 语义失效）",
        file: "src/core.js",
        find: "const source = (definition.parts || []).map((part) => vars[part] == null ? \"\" : String(vars[part])).join(\"\");",
        replace: "const source = (definition.parts || []).join(\"\");",
        testFile: "tests/comprehensive-core.test.js",
        testName: "A5 generatedVars md5/signature",
        expect: "killed"
    },

    // ===== G4 --allow-external-plugins 安全闸门 =====
    {
        id: "M45",
        description: "外部插件闸门反向（默认放行、加 flag 反而拒绝）",
        file: "src/cli.js",
        find: "if (options.allowExternalPlugins) {",
        replace: "if (!options.allowExternalPlugins) {",
        testFile: "tests/comprehensive-cli.test.js",
        testName: "C12 --allow-external-plugins",
        expect: "killed"
    },

    // ===== G5 serve × 用户级项目登记 =====
    {
        id: "M46",
        description: "显式 --port 不再写回项目登记（固定端口漂移）",
        file: "src/project-registry.js",
        find: "if (entry.port !== explicitPort) {",
        replace: "if (false) {",
        testFile: "tests/comprehensive-cli.test.js",
        testName: "C11 serve×项目登记",
        expect: "killed"
    },
    {
        id: "M47",
        description: "reassign 顺延分支失效（端口被占时仍坚持登记端口）",
        file: "src/project-registry.js",
        find: "} else if (reassign && !(await isPortFree(entry.port))) {",
        replace: "} else if (false) {",
        testFile: "tests/comprehensive-cli.test.js",
        testName: "C11 projects ensure --reassign",
        expect: "killed"
    },
    {
        id: "M48",
        description: "serve 监听端口与登记端口漂移（+1）",
        file: "src/cli.js",
        find: "const port = ensured.entry.port;",
        replace: "const port = ensured.entry.port + 1;",
        testFile: "tests/comprehensive-cli.test.js",
        testName: "C11 serve×项目登记",
        expect: "killed"
    },
    {
        id: "M49",
        description: "projects ensure 忽略 --reassign 参数（命令层不接线）",
        file: "src/cli.js",
        // 锚点必须带 projects ensure 命令上下文：serve 也会接线
        // `reassign: args.reassign === true`，只用该行会命中 2 次而被 runner 拒绝注入
        // （避免误伤 serve 的命令层接线）。
        find: 'if (sub === "ensure") {\n        const ensured = await ensureProject(project, {\n            port: args.portExplicit ? args.port : undefined,\n            reassign: args.reassign === true,',
        replace: 'if (sub === "ensure") {\n        const ensured = await ensureProject(project, {\n            port: args.portExplicit ? args.port : undefined,\n            reassign: false,',
        testFile: "tests/comprehensive-cli.test.js",
        testName: "C11 projects ensure --reassign",
        expect: "killed"
    },

    // ===== G7 serve --open（平台门控，见文件头说明） =====
    {
        id: "M50",
        description: "serve --open 不再调用打开浏览器（UX flag 失效）",
        file: "src/cli.js",
        find: "if (args.open) openInBrowser(url);",
        replace: "if (false) openInBrowser(url);",
        testFile: "tests/comprehensive-cli.test.js",
        testName: "C13 serve --open",
        expect: "killed",
        // C13 用 PATH 注入 xdg-open 观测，仅 Linux 可靠；其他平台显式排除而不是记 survived。
        platforms: ["linux"]
    }
];

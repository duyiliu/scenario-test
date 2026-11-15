// 工作台场景编辑（YIL-199）：把内存中的场景定义序列化为 `ScenarioTest.registerScenario`
// 场景文件源码，供「保存场景 / 复制场景」写回项目。纯函数、无 DOM 依赖，Node 可直接导入测试。

// 场景文件相对路径白名单（浏览器工作台与 serve 服务端同口径）：
// 只允许项目内 `scenarios/**/*.js`，拒绝绝对路径、盘符、越界段与目录名点开头
export const SCENARIO_FILE_PATTERN = /^scenarios(?:\/[A-Za-z0-9][A-Za-z0-9_-]*)*\/[A-Za-z0-9][A-Za-z0-9_-]*\.js$/;

// 场景 id 白名单：与 init 模板约定一致（小写短横线标识），服务端注册清单条目前校验
export const SCENARIO_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/;

export function isSafeScenarioFile(file) {
    return SCENARIO_FILE_PATTERN.test(String(file || ''));
}

export function isSafeScenarioId(id) {
    return SCENARIO_ID_PATTERN.test(String(id || ''));
}

// 由任意名称推导合法场景 id：转小写、非字母数字折成短横线；中文等非 ASCII 被剥离后
// 可能为空，由调用方回退默认前缀（如复制场景的源 id + '-copy'）
export function slugifyScenarioId(name) {
    var slug = String(name || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-');
    return slug.slice(0, 80).replace(/-+$/g, '');
}

function serializeString(value) {
    // JSON.stringify 已处理引号/反斜杠/控制符转义，场景源码统一双引号风格
    return JSON.stringify(value);
}

// 函数字段（如 onAttempt/retry 回调）按源码写回：toString() 已是合法表达式的直接放行；
// 对象简写方法（`onAttempt(ctx) {`/`async m()`）补成函数表达式，否则落盘即语法错。
// 原生/bound 函数与 getter/setter 写法无法转表达式，fail-loud 报错而不是落坏文件。
function serializeFunction(fn) {
    var source = Function.prototype.toString.call(fn).trim();
    if (/\{\s*\[native code\]\s*\}/.test(source)) {
        throw new Error('场景中的函数字段是原生/绑定函数，无法序列化: ' + source.slice(0, 60));
    }
    if (/^(async\s+)?function/.test(source) || /^(async\s+)?[\w.()\[\]'"]+\s*=>/.test(source) || source.startsWith('(')) {
        return source;
    }
    var methodMatch = /^(async\s*)?([A-Za-z_$][\w$]*)\s*\([\s\S]*$/.exec(source);
    if (methodMatch) {
        return (methodMatch[1] || '') + 'function ' + source.replace(/^async\s+/, '');
    }
    throw new Error('场景中的函数字段形态不支持序列化（如 getter/setter）: ' + source.slice(0, 60));
}

function isIdentifierKey(key) {
    return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key);
}

function serializeValue(value, indent) {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'function') return serializeFunction(value);
    if (typeof value === 'string') return serializeString(value);
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value instanceof RegExp) return String(value);
    if (value instanceof Date) return 'new Date(' + serializeString(value.toISOString()) + ')';
    if (Array.isArray(value)) {
        if (!value.length) return '[]';
        var pad = new Array(indent + 2).join('    ');
        var closePad = new Array(indent + 1).join('    ');
        var items = value.map(function (item) { return pad + serializeValue(item, indent + 1); });
        return '[\n' + items.join(',\n') + '\n' + closePad + ']';
    }
    if (typeof value === 'object') {
        var keys = Object.keys(value);
        if (!keys.length) return '{}';
        var objPad = new Array(indent + 2).join('    ');
        var objClosePad = new Array(indent + 1).join('    ');
        var props = keys.map(function (key) {
            var printed = isIdentifierKey(key) ? key : serializeString(key);
            return objPad + printed + ': ' + serializeValue(value[key], indent + 1);
        });
        return '{\n' + props.join(',\n') + '\n' + objClosePad + '}';
    }
    // symbol/bigint 等场景 DSL 不会出现的值：兜底字符串化（防御，不静默丢键）
    return serializeString(String(value));
}

// 场景定义 → registerScenario 第二参数的对象源码；顶层键 4 空格缩进（与 init 模板同风格）
export function serializeScenarioSource(scenario) {
    var keys = Object.keys(scenario || {});
    if (!keys.length) return '{}';
    return '{\n' + keys.map(function (key) {
        var printed = isIdentifierKey(key) ? key : serializeString(key);
        return '    ' + printed + ': ' + serializeValue(scenario[key], 1);
    }).join(',\n') + '\n}';
}

// 生成完整场景文件源码。id 仅要求非空——保存路径沿用文件注册的原 id（形态不限）；
// 新建场景（复制）由 isSafeScenarioId 先走严格形态校验。id 经 JSON 转义，不会逃出字符串字面量。
export function buildScenarioFileSource(id, scenario) {
    if (typeof id !== 'string' || !id.trim()) {
        throw new Error('场景 id 不能为空');
    }
    return 'ScenarioTest.registerScenario(' + serializeString(id)
        + ', ScenarioTest.defineScenario(' + serializeScenarioSource(scenario) + '));\n';
}

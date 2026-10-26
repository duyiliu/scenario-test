// 模板解析缺失变量的内部诊断通道：Symbol 键不会进入 vars / JSON 报告 / DSL 契约，
// 仅在引擎执行单个步骤期间挂到 runtime 上，由 core 解析器按需记录、engine 汇总后清除。
export const RESOLVE_WARNINGS = Symbol("scenario-test.resolveWarnings");

All notable changes to this project will be documented in this file.

## [Unreleased]

- **工作台场景编辑（YIL-199）**：工作台可在浏览器内编辑场景并持久化回 `scenarios/*.js` 场景文件。步骤列表「编辑」模式支持拖拽把手与 ↑↓ 按钮调整步骤顺序；场景列表悬停「复制」按钮生成新场景文件并自动注册进 `scenario.config.js` 的场景清单；「编辑变量」弹窗可增删改场景 `vars`/`envVars`。`serve` 新增 `POST /__scenario-test__/scenario-file` 与 `/__scenario-test__/config-scenarios` 写接口，仅接受本机 Origin、场景文件路径白名单（`scenarios/**/*.js`）与清单内文件，越界/重复/超大请求拒绝；独立 UMD / file:// 打开时保存与复制降级为源码复制到剪贴板。新增 `src/browser/ui/ui-editor.js` 场景序列化器（函数字段按源码写回），测试见 `tests/scenario-edit.test.js` 与 `tests/browser-comprehensive.test.mjs`。

- **断言扩展 `contains` 与 `jsonSchema`（contract v24，GH-159）**。`contains` 为 `includes` 的同口径别名（字符串子串 / 数组深比较成员，对象实际值按操作符名透出语义化引导）。`jsonSchema` 为 `shape` 的完整版：JSON Schema draft-07 常用子集——`type` 可数组、`const`/`enum`、`properties`/`patternProperties`/`additionalProperties`（可子模式）/`propertyNames`/`required`/`dependentRequired`/`dependentSchemas`/`minProperties`/`maxProperties`、数值 `minimum`/`maximum`/`exclusiveMinimum`/`exclusiveMaximum`/`multipleOf`、字符串 `minLength`/`maxLength`/`pattern`/`format`（白名单内 17 种：date-time/email/ipv4/uuid/int32 等）、数组 `items`（支持元组）/`additionalItems`/`contains`/`minItems`/`maxItems`/`uniqueItems`、组合器 `allOf`/`anyOf`/`oneOf`/`not`/`if`-`then`-`else`，子模式支持 boolean；`$ref` 不解析、未知键与顶层无约束定义在定义期即拒，失败明细按字段路径透出（复用 each/shape 分层渲染，工作台/CLI/报告同源）。
- **测试入口加单测试超时**：`scripts/run-tests.mjs` 向 `node --test` 传 `--test-timeout`（默认 120000ms，`TEST_TIMEOUT_MS` 可覆盖）。任一测试挂死时在超时后计为失败（`testTimeoutFailure`）并正常汇总，不再把整轮 `npm test` 无限拖死；不影响正常测试的判定与计数。
- **新增确定性发布消费链 E2E（`tests/e2e/`），闭合覆盖矩阵 G8 的确定性段**。真实执行 `install.sh`（ubuntu）/`install.ps1`（windows）完成「下载 → SHA-256 校验 → 用户级运行时落盘 → init → doctor → run → 报告产物」全链，经 `HOME`/`USERPROFILE` 隔离到临时目录、本地静态源模拟 CDN、零外网。`tests/e2e/helpers/`（static-source 动态算哈希生成 release.json、fixture-api login/orders、proc 平台脚本分发）；`tests/e2e/project/` 消费工程场景夹具。新增 `npm run test:e2e`（`scripts/run-e2e.mjs`）并接入 `check:all`/`test:all` 与 CI 独立 `e2e` job（ubuntu-24.04 + windows-latest，node 22）。LLM 段（skill-e2e 冒烟、场景设计 A/B）仍仅 192.168.1.214 手动，G8 LLM 段保持未验证。

## [0.15.0] - 2026-11-13

All notable changes to this project will be documented in this file.

## [Unreleased]

## [0.16.0] - 2026-11-23

### 发布与分发方式变更（破坏性）

- **构建产物不再入库**：`dist/`、`src/**/*.generated.js`、`skills/scenario-test/runtime/` 全部移出版本库并加入 `.gitignore`。仓库只剩源码；`npm test` 检测到产物缺失或比源码旧时自动先构建一次，克隆后无需手动 build。
- **发版改为 GitHub Release 资产**：推 tag `vX.Y.Z` 触发 `.github/workflows/release.yml`，CI 构建并打包 `scenario-test-runtime-vX.Y.Z.tar.gz` + `.sha256`，挂到 Release。一个 tag 对应一份不可变产物；npm Registry 仍不是分发渠道。
- **安装脚本改为下载整包**：`install.ps1` / `install.sh` 从 GitHub Release 取 tar.gz，先校验 sidecar 整包哈希，解压后再按包内 `release.json` 逐文件核对，然后原子写入 `~/.scenario-test/runtime/<版本>/`。`-Source` / `SCENARIO_TEST_SOURCE` 改为指向内网制品目录（需含同名 tar.gz 与 .sha256）。
- **Skill 不再内嵌运行时**：Skill 目录从 1.18 MB 降到约 26 KB，只含文本规则与脚本。新增 `scripts/ensure-runtime.mjs`，在第一次真正需要 CLI 时按 `SKILL.md` 的 `metadata.version` 下载并校验运行时到用户级目录；只读探测（`detect-project.mjs`）仍然不联网、不写文件。运行时跨项目、跨 Agent 共用，版本目录并存可回退。

### 修复

- **修复 v0.15.0 起安装链中断**：安装脚本的下载清单含 `AI_SCENARIO_PROMPT.md` 与 `SCENARIO_PATTERNS.md`，但这两个文件此前只存在于已提交的 Skill `runtime/` 副本中，`dist/` 下从未存在（实测 404）。现在由 `scripts/build.mjs` 从 `init-templates.js` 投影进 `dist/`，随发布包分发，结构上不再可能错位。
- `scripts/auto-merge-gate.mjs` 的 `dist/` 生成物豁免成为死代码（无生成物入库），门禁的 200 行 / 6 文件上限按真实改动计算。
- CI 删除「dist 新鲜度」检查，改为校验构建产物完整性（8 个文件齐备）。

- **工作台场景编辑（YIL-199）**：工作台可在浏览器内编辑场景并持久化回 `scenarios/*.js` 场景文件。步骤列表「编辑」模式支持拖拽把手与 ↑↓ 按钮调整步骤顺序；场景列表悬停「复制」按钮生成新场景文件并自动注册进 `scenario.config.js` 的场景清单；「编辑变量」弹窗可增删改场景 `vars`/`envVars`。`serve` 新增 `POST /__scenario-test__/scenario-file` 与 `/__scenario-test__/config-scenarios` 写接口，仅接受本机 Origin、场景文件路径白名单（`scenarios/**/*.js`）与清单内文件，越界/重复/超大请求拒绝；独立 UMD / file:// 打开时保存与复制降级为源码复制到剪贴板。新增 `src/browser/ui/ui-editor.js` 场景序列化器（函数字段按源码写回），测试见 `tests/scenario-edit.test.js` 与 `tests/browser-comprehensive.test.mjs`。

- **断言扩展 `contains` 与 `jsonSchema`（contract v24，GH-159）**。`contains` 为 `includes` 的同口径别名（字符串子串 / 数组深比较成员，对象实际值按操作符名透出语义化引导）。`jsonSchema` 为 `shape` 的完整版：JSON Schema draft-07 常用子集——`type` 可数组、`const`/`enum`、`properties`/`patternProperties`/`additionalProperties`（可子模式）/`propertyNames`/`required`/`dependentRequired`/`dependentSchemas`/`minProperties`/`maxProperties`、数值 `minimum`/`maximum`/`exclusiveMinimum`/`exclusiveMaximum`/`multipleOf`、字符串 `minLength`/`maxLength`/`pattern`/`format`（白名单内 17 种：date-time/email/ipv4/uuid/int32 等）、数组 `items`（支持元组）/`additionalItems`/`contains`/`minItems`/`maxItems`/`uniqueItems`、组合器 `allOf`/`anyOf`/`oneOf`/`not`/`if`-`then`-`else`，子模式支持 boolean；`$ref` 不解析、未知键与顶层无约束定义在定义期即拒，失败明细按字段路径透出（复用 each/shape 分层渲染，工作台/CLI/报告同源）。
- **测试入口加单测试超时**：`scripts/run-tests.mjs` 向 `node --test` 传 `--test-timeout`（默认 120000ms，`TEST_TIMEOUT_MS` 可覆盖）。任一测试挂死时在超时后计为失败（`testTimeoutFailure`）并正常汇总，不再把整轮 `npm test` 无限拖死；不影响正常测试的判定与计数。
- **新增确定性发布消费链 E2E（`tests/e2e/`），闭合覆盖矩阵 G8 的确定性段**。真实执行 `install.sh`（ubuntu）/`install.ps1`（windows）完成「下载 → SHA-256 校验 → 用户级运行时落盘 → init → doctor → run → 报告产物」全链，经 `HOME`/`USERPROFILE` 隔离到临时目录、本地静态源模拟 CDN、零外网。`tests/e2e/helpers/`（static-source 动态算哈希生成 release.json、fixture-api login/orders、proc 平台脚本分发）；`tests/e2e/project/` 消费工程场景夹具。新增 `npm run test:e2e`（`scripts/run-e2e.mjs`）并接入 `check:all`/`test:all` 与 CI 独立 `e2e` job（ubuntu-24.04 + windows-latest，node 22）。LLM 段（skill-e2e 冒烟、场景设计 A/B）仍仅 192.168.1.214 手动，G8 LLM 段保持未验证。

## [0.15.0] - 2026-11-13

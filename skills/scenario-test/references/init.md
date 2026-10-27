# 初始化、修复、升级

探测脚本检查文件存在性，`doctor` 才负责运行时完整性、版本锁、配置有效性检查。

## 前置检查

1. 使用探测结果确认 `projectRoot` 是本次业务项目根目录；无法确定时说明候选目录，不要跨项目操作。仅在需要安装/修复/升级时用 `node -v` 实测 Node.js >=18（不以文档假设代替检查）并确认项目目录可写；`installed` 的日常使用不重复这些检查。
2. `installed` 时，普通“测试某个功能”请求直接进入 `author.md`，**不得先重跑安装**。
3. `incomplete` 时展示缺失项；不要删除目录、覆盖配置或场景。修复前备份/确认可能受影响文件。
4. 用户明确要求升级时，再查看当前版本锁及目标发布版本，并确认安装来源；不要把全局 Skill 版本等同于运行时版本。
5. `not-initialized` 且本次请求是生成/补充/执行场景测试时，按下方“自动初始化”直接安装，不再等待二次确认；仅询问能力或文档时不要安装。

## 自动初始化（默认行为）

用户请求为某个业务功能生成/补充/执行场景测试，而项目尚未接入时，直接完成初始化，不再要求二次确认：

1. 先做环境检查：`node -v` ≥ 18、项目根目录可写、安装源可达（默认 npm Registry，脚本经 GitHub/jsDelivr 获取）。任一不满足时停止并给出可执行建议（内网用 `-Source` / `SCENARIO_TEST_SOURCE`、本地 dist 初始化、或先安装 Node），不要静默降级或跳过检查。
2. 确认 `projectRoot` 与目标目录（默认 `scenario-test`），用一行说明将执行的安装命令。
3. 从公共仓库 https://github.com/duyiliu/scenario-test 的 README「快速接入」获取并执行**固定 tag** 的官方安装脚本（Windows PowerShell / macOS·Linux Bash）。不要在 Skill 内手抄版本号，也不要拼接未确认来源。
4. 重新运行探测脚本确认 `status=installed`，再执行 `doctor`；FAIL 时停止并报告。
5. 通过后按 `author.md` 继续，不需要用户再次确认接入。

例外（改为先征询）：用户明确拒绝自动安装、设置 `SCENARIO_TEST_NO_AUTO_INIT=1`、`status=incomplete`（不自动修复），或用户只是询问能力/文档而未提出测试需求。

## 安装源

默认且唯一推荐的来源是 README「快速接入」中的固定 tag 官方脚本（从 npm Registry 下载固定版本 tarball）。仅当用户明确要求以下方式时，才改用对应来源，并在结果中说明：

- **本地/未发布版本（开发验证）**：用目标仓库产物初始化，例如
  `node <仓库根>/dist/scenario-test-cli.cjs init --project . --dir scenario-test --no-input`；
  或用 `--library-url <包含 CLI/UMD/d.ts/capabilities 的目录>` 指定运行时目录。产物版本可能与发布版不同，以 `doctor` 显示的实际版本为准。
- **内网**：使用 README 已有的 `-Source` / `SCENARIO_TEST_SOURCE`（或安装脚本第三个参数）指向内网运行时目录。
- **npm 模式**：仅用户指定时使用 `npm install -D @yc_yzkj/scenario-test` + `npx @yc_yzkj/scenario-test init --project . --dir "scenario-test"`。

不要自行降级、切换或拼接未确认来源。

## 幂等与覆盖语义

`init` 幂等，可重复执行：`--no-input` 对已存在目录按 keep 语义保留 `scenario.config.js` 与 `scenarios/`，仅刷新 `.scenario-test/` 运行时副本与 AI 规则；只有 `--force` 会覆盖已有配置/场景，默认禁止使用。重复执行不会产生重复场景或丢失已有改动。

## 接入方式

- **默认免 npm**。安装命令及当前固定发布版本以公共仓库 `README.md` 的“快速接入”及 `scripts/install.ps1`、`scripts/install.sh` 为准；不要在本 Skill 手抄固定版本号。先核对来源与发布 tag，再在**确认的项目根目录**运行对应平台脚本。该脚本将运行时、AI 规则及能力清单放进项目的 `scenario-test/.scenario-test/`，并执行 doctor。
- Windows：执行仓库 README 中**固定 tag** 的 PowerShell 安装命令；优先下载审阅脚本后运行，不拼接未确认来源。
- macOS / Linux：执行 README 中**固定 tag** 的 Bash 安装命令。内网环境使用仓库文档已有的 `-Source` 或 `SCENARIO_TEST_SOURCE` 支持，不自行降级/切换安装模式。
- 只有用户指定 npm 模式时才使用 `npm install -D @yc_yzkj/scenario-test` + `npx @yc_yzkj/scenario-test init ...`。
- 既有项目升级遵守 `init` 的 keep 语义，**不用 `--force`**，否则可能覆盖业务配置。使用官方安装脚本升级之前告知运行时副本、AI 规则将更新；先保存未提交改动。

## 安装后的确认

1. 重新运行探测脚本，确认 `status=installed`。
2. 在该项目执行 `node <cli> doctor --config <config>`。存在 FAIL 时停止并报告，不进入场景编写/执行。禁止悄悄更换 npm/免 npm 模式。
3. 通过后加载 `<scenarioDir>/.scenario-test/AI_SCENARIO_PROMPT.md`，如用户已提供业务功能与入口可接着进入编写阶段；若没有业务目标，只问用户要测试哪个业务功能（页面、Controller、接口或已有测试任一入口）。

该工作流不执行 HTTP 测试、不启动工作台、不需要业务凭据。

# 初始化、修复、升级

此工作流仅在用户**明确请求接入、安装、升级或授权修复**时使用。探测脚本检查文件存在性，`doctor` 才负责运行时完整性、版本锁、配置有效性检查。

## 前置检查

1. 使用探测结果确认 `projectRoot` 是本次业务项目根目录；无法确定时说明候选目录，不要跨项目操作。确保 Node.js >=18。
2. `installed` 时，普通“测试某个功能”请求直接进入 `author.md`，**不得先重跑安装**。
3. `incomplete` 时展示缺失项；不要删除目录、覆盖配置或场景。修复前备份/确认可能受影响文件。
4. 用户明确要求升级时，再查看当前版本锁及目标发布版本，并确认安装来源；不要把全局 Skill 版本等同于运行时版本。

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

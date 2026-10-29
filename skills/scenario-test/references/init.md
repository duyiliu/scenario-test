# 初始化、修复、升级

探测脚本检查文件存在性，`doctor` 才负责运行时完整性、版本锁、配置有效性检查。

## 前置检查

1. 使用探测结果确认 `projectRoot` 是本次业务项目根目录；无法确定时说明候选目录，不要跨项目操作。仅在需要安装/修复/升级时用 `node -v` 实测 Node.js >=18（不以文档假设代替检查）并确认项目目录可写；`installed` 的日常使用不重复这些检查。
2. `installed` 时，普通“测试某个功能”请求直接进入 `author.md`，**不得先重跑安装**。
3. `incomplete` 时展示缺失项；不要删除目录、覆盖配置或场景。修复前备份/确认可能受影响文件。
4. 用户明确要求升级时，再查看当前版本锁及目标发布版本，并确认安装来源；不要把全局 Skill 版本等同于运行时版本。
5. `not-initialized` 且本次请求是生成/补充/执行场景测试时，按下方“自动初始化”直接安装，不再等待二次确认；仅询问能力或文档时不要安装。

## 自动初始化（默认行为）

1. 确认 Node.js 18+、项目根目录可写，执行 `node <本Skill目录>/scripts/check-runtime.mjs` 校验 Skill 自带运行时。
2. 在确认的项目根目录执行 `node <本Skill目录>/runtime/scenario-test-cli.cjs init --project <projectRoot> --dir scenario-test --no-input`；自定义目录使用探测时的 `--dir`。运行时文件从 Skill 自带的同目录发布产物复制，无需下载、无需源码仓库。
3. 重新探测，再使用项目内 CLI 运行 `doctor --config <config>`；任何检查失败时停止并报告。
4. 用户明确拒绝自动安装、设置 `SCENARIO_TEST_NO_AUTO_INIT=1` 或项目不完整时，不自动初始化或修复；只询问能力时不安装。

Skill 自带运行时的发布版本与来源见 `runtime/release.json`。用户明确要求升级已有项目时，先核对当前版本与目标版本；仅当 Skill 自带版本符合用户指定的目标且不会降级时，备份并告知将更新运行时副本和 AI 规则，再使用 Skill CLI 的 `init --no-input`，不可使用 `--force`。不能满足目标版本时先更新 Skill；需要降级须获用户明确要求。需要其他发布版本时先更新或安装对应版本的 Skill，不使用项目源码构建产物。内网或 npm 等特殊接入仅按用户明确要求处理。

## 幂等与覆盖语义

`init` 幂等，可重复执行：`--no-input` 对已存在目录按 keep 语义保留 `scenario.config.js` 与 `scenarios/`，仅刷新 `.scenario-test/` 运行时副本与 AI 规则；只有 `--force` 会覆盖已有配置/场景，默认禁止使用。重复执行不会产生重复场景或丢失已有改动。

## 安装后的确认

1. 重新运行探测脚本，确认 `status=installed`。
2. 执行 `node <cli> doctor --config <config>`，其中 `<cli>` 为探测结果中的项目内 CLI。存在 FAIL 时停止并报告，不进入场景编写/执行。禁止悄悄更换 npm/免 npm 模式。
3. 通过后加载 `<scenarioDir>/.scenario-test/AI_SCENARIO_PROMPT.md`，如用户已提供业务功能与入口可接着进入编写阶段；若没有业务目标，只问用户要测试哪个业务功能（页面、Controller、接口或已有测试任一入口）。

该工作流不执行 HTTP 测试、不启动工作台、不需要业务凭据。

# 初始化、修复、升级

探测脚本检查项目场景数据是否存在；`doctor` 负责 DSL 与配置合法性检查。**v23 起运行时去项目化**：项目只保留 `scenario.config.js` 与 `scenarios/`（可选 `e2e/`），CLI、工作台页面与 AI 规则统一由 Skill 的 `runtime/` 提供，项目内不再落 `.scenario-test/` 副本。

## 前置检查

1. 使用探测结果确认 `projectRoot` 是本次业务项目根目录；无法确定时说明候选目录，不要跨项目操作。仅在需要安装/修复/升级时用 `node -v` 实测 Node.js >=22（不以文档假设代替检查）并确认项目目录可写；`installed` 的日常使用不重复这些检查。
2. **`scenario-test/` 目录落点按测试对象所在仓库决定**（本 Skill 中立，由接入方结构决定）：
   - 前后端同仓（monorepo / 后端内嵌前端目录）：`scenario-test/` 落仓根，HTTP 场景与 `e2e/` 浏览器测试同目录一处维护。
   - 前后端分仓：接口场景落后端仓、浏览器 E2E 落前端仓，两仓各 `init` 一次；跨端流程测试（前端操作驱动后端接口）放前端仓——发起动作在浏览器侧。
   - 独立 QA/测试仓：用 `--project <测试仓根>` 落进去，与被测代码解耦。
   原则：**测试与被测代码同仓同 PR**，接口改了场景同步改、页面改了 E2E 同步改，CI 才能拦回归；不要为「集中」把测试丢进无人同步的独立仓而脱离被测代码演进。
3. `installed` 时，普通"测试某个功能"请求直接进入 `author.md`，**不得先重跑安装**。
4. `incomplete` 时展示缺失项；不要删除目录、覆盖配置或场景。修复前备份/确认可能受影响文件。
5. 用户明确要求升级时，升级对象是**安装方运行时本身**（Skill 或用户级安装），不是项目内副本：项目没有版本锁。先核对 `runtime/release.json` 的目标版本；需要更高/指定版本时先更新 Skill（重跑安装脚本），不能降级须获用户明确要求。
6. `not-initialized` 且本次请求是生成/补充/执行场景测试时，按下方"自动初始化"直接安装，不再等待二次确认；仅询问能力或文档时不要安装。

## 自动初始化（默认行为）

1. 确认 Node.js 22+、项目根目录可写，执行 `node <本Skill目录>/scripts/check-runtime.mjs` 校验 Skill 自带运行时（含 AI 规则文件）。
2. 在确认的项目根目录执行 `node <本Skill目录>/runtime/scenario-test-cli.cjs init --project <projectRoot> --dir scenario-test --no-input`；自定义目录使用探测时的 `--dir`。init 只写 `scenario.config.js`、`scenarios/`、`README.md` 与 `start-scenario-test.cmd`（内含本机运行时路径，机器本地），不复制任何运行时文件。
3. 重新探测，再使用 Skill CLI 运行 `doctor --config <config>`；任何检查失败时停止并报告。
4. 用户明确拒绝自动安装、设置 `SCENARIO_TEST_NO_AUTO_INIT=1` 或项目不完整时，不自动初始化或修复；只询问能力时不安装。

Skill 自带运行时的发布版本与来源见 `runtime/release.json`。内网接入（`-Source` / `SCENARIO_TEST_SOURCE`）仅按用户明确要求处理；npm 包不再是分发渠道，不要建议 `npm install`。

## 幂等与覆盖语义

`init` 幂等，可重复执行：`--no-input` 对已存在目录按 keep 语义保留 `scenario.config.js` 与 `scenarios/`，仅刷新 `README.md` 与 `start-scenario-test.cmd`（更新本机运行时路径）；只有 `--force` 会覆盖已有配置/场景，默认禁止使用。重复执行不会产生重复场景或丢失已有改动。

`init --clean` 仅删除旧版（v22 及以前）init/安装脚本落盘的项目内副本：`.scenario-test/` 下的 CLI/UMD/d.ts/capabilities/版本锁/AI 规则副本与根目录 `index.html`。它**不触碰** `scenario.config.js`、`scenarios/`、`e2e/`、`plugins/` 等任何项目内容。探测到 `legacy` 非空时提示用户运行它。

## 安装后的确认

1. 重新运行探测脚本，确认 `status=installed`、`legacy` 为空。
2. 执行 `node <cli> doctor --config <config>`（`<cli>` 即探测结果中的 Skill 运行时路径）。存在 FAIL 时停止并报告；`scenario-register`/`config-load` 类 FAIL 多半是场景按更高 contract 所写，按 fix 提示引导用户升级安装方，不在本流程内升级项目。
3. 通过后加载安装方的 `AI_SCENARIO_PROMPT.md`（探测结果 `authoringPrompt`）；如用户已提供业务功能与入口可接着进入编写阶段；若没有业务目标，只问用户要测试哪个业务功能（页面、Controller、接口或已有测试任一入口）。

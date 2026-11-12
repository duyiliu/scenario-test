# 发布流程

> ⚠️ **内部/历史文档**：本指南是仓库维护者的发布流程。对外接入默认**免 npm**
> （官方安装脚本按固定 GitHub Tag 经 jsDelivr 下载发布版 `dist/` 运行时文件，
> 在本地初始化，不修改业务项目依赖）。对外安装指引见 [README](../README.md)（"快速接入"内联 AI 接入 Prompt）。
> 仓库内的 `scripts/publish-release.mjs`（GitLab CI）仅用于内部镜像发布。

`master` 只包含可发布代码。`dist/` 随版本提交，**GitHub Tag 就是唯一发布产物**：
Tag 的源码归档已包含完整 `dist/`，安装脚本经 jsDelivr 按 Tag 下载 `dist/` 下 4 个
运行时文件（`scenario-test-cli.cjs`、`scenario-test.umd.js`、`scenario-test.d.ts`、
`scenario-test-capabilities.json`）到 Skill `runtime/`（v23 起项目内不再有运行时副本）。
**npm Registry 不再是分发渠道**：`package.json` 已标记 `private`，不再执行 `npm publish`；
Registry 上的存量 `@yc_yzkj/scenario-test` 停留在旧版本，不为新版本更新。
内网可通过 `Source` / `SCENARIO_TEST_SOURCE` 改用 GitLab Raw 或制品目录。

## 发布步骤

1. 修改 `package.json` 版本号，遵循语义化版本；同步更新 `package-lock.json`、
   `CHANGELOG.md`、`scripts/install.ps1` / `scripts/install.sh` 中的固定版本与
   jsDelivr dist URL，以及 README / AI Prompt 中固定 Tag 的 jsDelivr 安装脚本 URL。
   构建后确认 `src/version.generated.js`、`dist/` 版本一致。
2. 同步 Skill 发布版运行时（详见下文「Skill 发布版运行时同步」）：从刚构建的 `dist/`
   复制 4 个运行时文件到 `skills/scenario-test/runtime/`，并重新生成
   `AI_SCENARIO_PROMPT.md`、`SCENARIO_PATTERNS.md`（由 `init-templates.js` 投影），
   更新 `release.json` 的 `version`、`source`（指向新 Tag）与全部 6 个文件的 SHA-256。
3. 本地运行：

   ```powershell
   npm run check:all
   node --test tests/skill-runtime.test.js
   npm audit   # 期望 0 vulnerabilities；运行时依赖链上不允许遗留，devDependencies 链上遗留需在 issue 中登记
   ```

4. 提交版本变更（含 `runtime/` 与 `release.json` 同步）并推送 `master`。
5. 创建并推送同名 Tag：

   ```powershell
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push github vX.Y.Z
   ```

6. 创建正式 GitHub Release。此步骤是发版必选项——GitHub Release 即正式发布记录，
   Tag 归档即分发产物。先根据对应版本的 `CHANGELOG.md` 准备临时 `RELEASE_NOTES.md`，
   发布完成后删除该临时文件，不提交到仓库：

   ```powershell
   gh release create vX.Y.Z `
     --verify-tag `
     --latest `
     --title "vX.Y.Z" `
     --notes-file RELEASE_NOTES.md
   ```

   Release 说明应基于对应版本的 `CHANGELOG.md`，至少包含主要变更、固定版本安装命令
   和验证结果。Release 必须满足：

   - Tag 与版本号一致，格式为 `vX.Y.Z`；
   - 非 Draft、非 Prerelease；
   - 正式版本标记为 Latest Release；
   - 不覆盖或重建已发布 Tag；修复必须发布新的 patch 版本。

   创建后必须验证（GitHub Release、Git Tag 与安装脚本下载源三处一致）：

   ```powershell
   gh release view vX.Y.Z --json url,isDraft,isPrerelease,tagName,name
   # 安装脚本默认下载源可访问（应全部 200）：
   # https://cdn.jsdelivr.net/gh/duyiliu/scenario-test@vX.Y.Z/dist/scenario-test-cli.cjs
   ```

   Windows 浏览器工作台也可直接使用发行版中的启动脚本。脚本默认读取业务项目根目录下
   的 `scenario-test/scenario.config.js`，默认只启动服务；传入 `-OpenBrowser` 才会自动
   打开浏览器：

   ```powershell
   & ".\start-scenario-test.ps1" -Project . -OpenBrowser
   ```

   GitLab Release 同步提供 `start-scenario-test.ps1` 下载资产，脚本与该版本的 CLI、UMD 保持一致。

v23 起运行时去项目化：`init` 只写场景数据（`scenario.config.js`、`README.md`、
`start-scenario-test.cmd`），项目内不再有 `index.html`、`.scenario-test/` 副本或
版本锁。工作台页由 `serve` 动态生成，UMD 通过虚拟路由 `/__scenario-test__/scenario-test.umd.js`
直接从运行时 `dist/` 提供；安装脚本把运行时下载到用户级目录
（`~/.scenario-test/runtime/` 或 `%USERPROFILE%\.scenario-test\runtime\`），
`.cmd` 记录该 CLI 的绝对路径。升级以「场景需要 contract ≥ N，当前运行时 contract M」
的能力错提示驱动，用户明确要求升级时重跑安装脚本更新运行时目录。

已发布 Tag 不覆盖重推。修复通过新的 patch Tag 发布。

GitHub Pages 仅在需要公开文档或在线 Mock Demo 时启用，不作为 CLI/UMD 的生产分发地址。

## Skill 发布版运行时同步

`skills/scenario-test/runtime/` 内嵌发布版运行时（CLI + UMD + d.ts + 能力清单 +
AI 规则文件），供 Skill 离线初始化项目并统一承接诊断/执行/工作台。
**同步是发版提交的一部分**：在版本构建之后、发布提交之前，从本地 `dist/` 复制
`scenario-test-cli.cjs`、`scenario-test.umd.js`、`scenario-test.d.ts`、
`scenario-test-capabilities.json` 到 `runtime/`，重新生成
`AI_SCENARIO_PROMPT.md`、`SCENARIO_PATTERNS.md`（由 `init-templates.js` 的
`AUTHORING_PROMPT`/`SCENARIO_PATTERNS` 投影，`tests/contract.test.js` 校验一致性），
并更新 `release.json`：

- `version`：与 `package.json` 一致；
- `source`：指向本次发布 Tag，如 `https://github.com/duyiliu/scenario-test/tree/vX.Y.Z`；
- `sha256`：6 个文件各自的 SHA-256 十六进制值。

同步前先确认本地 `dist/` 是本次版本 `npm run build` 的产物（`src/version.generated.js`
版本与 `package.json` 一致）；不要用旧构建或手工拼接的产物。同步后运行
`node --test tests/skill-runtime.test.js`，确认 Skill 的离线初始化、doctor 和运行时
校验通过，再随发布提交一起推送。

项目不含运行时副本，因此不存在「项目版本与 Skill 版本不一致」的问题：升级即更新
安装方运行时本身（重跑安装脚本/更新 Skill），仅在场景声明的 contract 能力高于当前
运行时时由 doctor/CLI 报告能力错。存量 npm 包冻结不更新；
需要 npm 安装方式的团队只能固定到 Registry 上已发布的旧版本，不作为推荐路径。

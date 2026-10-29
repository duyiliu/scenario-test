# 发布流程

> ⚠️ **内部/历史文档**：本指南是仓库维护者的发布流程。对外接入默认**免 npm**
> （官方安装脚本按固定 GitHub Tag 经 jsDelivr 下载发布版 `dist/` 运行时文件，
> 在本地初始化，不修改业务项目依赖）。对外安装指引见 [README](../README.md)（"快速接入"内联 AI 接入 Prompt）。
> 仓库内的 `scripts/publish-release.mjs`（GitLab CI）仅用于内部镜像发布。

`master` 只包含可发布代码。`dist/` 随版本提交，**GitHub Tag 就是唯一发布产物**：
Tag 的源码归档已包含完整 `dist/`，安装脚本经 jsDelivr 按 Tag 下载 `dist/` 下 4 个
运行时文件（`scenario-test-cli.cjs`、`scenario-test.umd.js`、`scenario-test.d.ts`、
`scenario-test-capabilities.json`）到项目 `.scenario-test/`。
**npm Registry 不再是分发渠道**：`package.json` 已标记 `private`，不再执行 `npm publish`；
Registry 上的存量 `@yc_yzkj/scenario-test` 停留在旧版本，不为新版本更新。
内网可通过 `Source` / `SCENARIO_TEST_SOURCE` 改用 GitLab Raw 或制品目录。

## 发布步骤

1. 修改 `package.json` 版本号，遵循语义化版本；同步更新 `package-lock.json`、
   `CHANGELOG.md`、`scripts/install.ps1` / `scripts/install.sh` 中的固定版本与
   jsDelivr dist URL，以及 README / AI Prompt 中固定 Tag 的 jsDelivr 安装脚本 URL。
   构建后确认 `src/version.generated.js`、`dist/` 版本一致。
2. 同步 Skill 发布版运行时（详见下文「Skill 发布版运行时同步」）：从刚构建的 `dist/`
   复制 4 个运行时文件到 `skills/scenario-test/runtime/`，更新 `release.json` 的
   `version`、`source`（指向新 Tag）与 4 个文件的 SHA-256。
3. 本地运行：

   ```powershell
   npm run check:all
   npm run test:coverage
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

业务项目由 `init` 生成 `index.html`，引用项目内运行时副本：

```html
<script src="./.scenario-test/scenario-test.umd.js"></script>
```

`init` 优先从本机 `dist/` 拷贝运行时副本（CLI 自身复制 + UMD/d.ts/能力清单同目录拷贝）；
本机没有 `dist` 时可用 `--library-url <目录>` 指定包含全部运行时文件的目录（默认指向
固定版本 GitHub Tag 的 `dist/` jsDelivr 目录，仅作兜底）。安装脚本会先下载固定版本
`dist/` 文件到临时目录再执行 init，因此正常安装路径不触发远程兜底下载。人工场景测试
通过 `start-scenario-test.cmd` 启动，`serve` 把接口请求代理到环境 `baseUrl`（页面
`baseUrl` 留空即走代理），无需后端放行 CORS。

已发布 Tag 不覆盖重推。修复通过新的 patch Tag 发布。

GitHub Pages 仅在需要公开文档或在线 Mock Demo 时启用，不作为 CLI/UMD 的生产分发地址。

## Skill 发布版运行时同步

`skills/scenario-test/runtime/` 内嵌发布版运行时，供 Skill 对未接入项目执行离线初始化。
**同步是发版提交的一部分**：在版本构建之后、发布提交之前，从本地 `dist/` 复制
`scenario-test-cli.cjs`、`scenario-test.umd.js`、`scenario-test.d.ts`、
`scenario-test-capabilities.json` 到 `runtime/`，并更新 `release.json`：

- `version`：与 `package.json` 一致；
- `source`：指向本次发布 Tag，如 `https://github.com/duyiliu/scenario-test/tree/vX.Y.Z`；
- `sha256`：4 个文件各自的 SHA-256 十六进制值。

同步前先确认本地 `dist/` 是本次版本 `npm run build` 的产物（`src/version.generated.js`
版本与 `package.json` 一致）；不要用旧构建或手工拼接的产物。同步后运行
`node --test tests/skill-runtime.test.js`，确认 Skill 的离线初始化、项目内 CLI 的
doctor 和运行时校验通过，再随发布提交一起推送。

项目不要求与 Skill 版本一致，升级项目需用户明确要求。存量 npm 包冻结不更新；
需要 npm 安装方式的团队只能固定到 Registry 上已发布的旧版本，不作为推荐路径。

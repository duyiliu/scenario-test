# 发布流程

> ⚠️ **内部/历史文档**：本指南是仓库维护者的发布流程。对外接入默认**免 npm**
> （官方安装脚本从 npm Registry 下载固定版本 tarball，在本地解压后初始化，不修改业务项目依赖），
> 对外安装指引见 [README](../README.md)（“快速接入”内联 AI 接入 Prompt）。
> 仓库内的 `scripts/publish-release.mjs`（GitLab CI）仅用于内部镜像发布。

`master` 只包含可发布代码。`dist/` 随版本提交，npm tarball 也必须包含完整 `dist/`。消费者默认免 npm：官方 `install.ps1` / `install.sh` 从固定版本 npm Registry tarball 下载并解压运行时到项目 `.scenario-test/`；npm（`@yc_yzkj/scenario-test`）为显式可选方式（`-UseNpm` / `SCENARIO_TEST_USE_NPM=true`）。内网可通过 `Source` / `SCENARIO_TEST_SOURCE` 改用 GitLab Raw 或制品目录。

## 发布步骤

1. 修改 `package.json` 版本号，遵循语义化版本；同步更新 `package-lock.json`、`CHANGELOG.md`、`scripts/install.ps1` / `scripts/install.sh` 中的固定版本与 npm tarball URL，以及 README / AI Prompt 中固定 Tag 的 jsDelivr 安装脚本 URL。构建后确认 `src/version.generated.js`、`dist/` 和 `npm pack` 内容版本一致。
2. 本地运行：

   ```powershell
   npm run check:all   # 完整门禁：build + 单元/浏览器/样式测试 + 覆盖率验证（与 check 等价）
   npm audit   # 期望 0 vulnerabilities；运行时依赖链上不允许遗留，devDependencies 链上遗留需在 issue 中登记
   ```

3. 提交版本变更并推送 `master`。
4. 创建并推送同名 Tag：

   ```powershell
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push github vX.Y.Z
   ```

5. 发布到 npm（scoped 包需 `--access public` 或私有 org）：

   ```powershell
   npm run build
   npm publish --access public
   ```

   > **npm 认证（2026-10 起生效）**：npm 政策要求发包账号开启 2FA，或使用带 **bypass 2FA** 权限的 Granular Access Token。`duyiliu` 账号当前未开 2FA，直接 publish 会 403。流程：
   >
   > 1. 到 https://www.npmjs.com/settings/duyiliu/tokens/create 生成 Granular Access Token：权限 Read and write、勾选 bypass 2FA、包范围限定 `@yc_yzkj/scenario-test`；
   > 2. 写入认证（用完即删，token 不落仓库）：
   >
   >    ```bash
   >    printf '//registry.npmjs.org/:_authToken=npm_xxx\n' >> ~/.npmrc
   >    npm whoami   # 应输出 duyiliu
   >    ```
   >
   > 3. publish 成功后立即撤销该 token 并从 `~/.npmrc` 删除对应行（`sed -i '/_authToken/d' ~/.npmrc`）。
   >
   > 注意：npm 官方已宣布 2027-01 起 bypass 2FA token 的直接 publish 权限将废止，届时迁移 Trusted Publishing（CI OIDC 免 token 方案）。

   `files` 必须包含 `dist`、`scripts/install.ps1`、`scripts/install.sh` 与 `scripts/start-scenario-test.ps1`；`bin` 指向 `dist/scenario-test-cli.cjs`（带 shebang，支持 `npx @yc_yzkj/scenario-test`）。安装脚本依赖 npm tarball 中的完整 `dist/`，发布前需用 `npm pack --dry-run` 核对。

   Windows 浏览器工作台也可直接使用发行版中的启动脚本。脚本默认读取业务项目根目录下的 `scenario-test/scenario.config.js`，默认只启动服务；传入 `-OpenBrowser` 才会自动打开浏览器：

   ```powershell
   & ".\start-scenario-test.ps1" -Project . -OpenBrowser
   ```

   GitLab Release 同步提供 `start-scenario-test.ps1` 下载资产，脚本与该版本的 CLI、UMD 保持一致。

6. 创建正式 GitHub Release。此步骤是发版必选项，不得只推送 Tag 或只发布 npm。先根据对应版本的 `CHANGELOG.md` 准备临时 `RELEASE_NOTES.md`，发布完成后删除该临时文件，不提交到仓库：

   ```powershell
   gh release create vX.Y.Z `
     --verify-tag `
     --latest `
     --title "vX.Y.Z" `
     --notes-file RELEASE_NOTES.md
   ```

   Release 说明应基于对应版本的 `CHANGELOG.md`，至少包含主要变更、固定版本安装命令、npm 包版本和验证结果。Release 必须满足：

   - Tag 与版本号一致，格式为 `vX.Y.Z`；
   - 非 Draft、非 Prerelease；
   - 正式版本标记为 Latest Release；
   - 不覆盖或重建已发布 Tag；修复必须发布新的 patch 版本。

   创建后必须验证：

   ```powershell
   gh release view vX.Y.Z --json url,isDraft,isPrerelease,tagName,name
   npm view @yc_yzkj/scenario-test@X.Y.Z version dist-tags.latest dist.shasum
   ```

   只有 GitHub Release、npm Registry 与 Git Tag 三处版本一致，发版才算完成。免 npm 默认下载源仍是 npm Registry 固定版本 tarball（`https://registry.npmjs.org/@yc_yzkj/scenario-test/-/scenario-test-vX.Y.Z.tgz`），GitHub Release 用于提供正式发布记录和源码归档，无需重复上传 npm tarball。内网可把 `Source` / `SCENARIO_TEST_SOURCE` 指向 GitLab Raw 或制品目录（需包含全部运行时文件）。

业务项目由 `init` 生成 `index.html`，引用项目内运行时副本：

```html
<script src="./.scenario-test/scenario-test.umd.js"></script>
```

`init` 优先从本机 `dist/` 拷贝运行时副本（CLI 自身复制 + UMD/d.ts/能力清单同目录拷贝）；本机没有 `dist` 时可用 `--library-url <目录>` 指定包含全部运行时文件的目录（默认指向固定版本 GitHub Tag 的 `dist/` Raw 目录，仅作兜底）。安装脚本（install.ps1/install.sh）会先下载固定版本 npm tarball 并解压出完整 `dist/`，因此正常安装路径不触发远程兜底下载。人工场景测试通过 `start-scenario-test.cmd` 启动，`serve` 把接口请求代理到环境 `baseUrl`（页面 `baseUrl` 留空即走代理），无需后端放行 CORS。

已发布 Tag 不覆盖重推。修复通过新的 patch Tag 发布。

GitHub Pages 仅在需要公开文档或在线 Mock Demo 时启用，不作为 CLI/UMD 的生产分发地址。

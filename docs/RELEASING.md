# 发布流程

> ⚠️ **内部文档**：本指南是仓库维护者的发布流程。对外接入默认**免 npm**（Skill 或安装脚本
> 按固定版本从 GitHub Release 下载运行时整包，在本地初始化，不修改业务项目依赖）。
> 对外安装指引见 [README](../README.md)。

`master` 只包含源码，**GitHub Release 才是唯一发布产物**。构建产物（`dist/`、
`src/**/*.generated.js`、`skills/**/runtime/`、`release/`）全部在 `.gitignore` 中，不进版本库。

一个 tag 对应一份不可变资产：

```
vX.Y.Z
  └─ scenario-test-runtime-vX.Y.Z.tar.gz          6 个运行时文件 + release.json
  └─ scenario-test-runtime-vX.Y.Z.tar.gz.sha256   整包 SHA-256
```

两个消费方都只认这一份字节：`scripts/install.ps1` / `install.sh`（预装运行时）与
`skills/scenario-test/scripts/ensure-runtime.mjs`（Skill 首次使用时按需安装）。两者都落到
`~/.scenario-test/runtime/<版本>/`。

**npm Registry 不再是分发渠道**：`package.json` 已标记 `private`，不执行 `npm publish`；
Registry 上的存量 `@yc_yzkj/scenario-test` 停留在旧版本，不为新版本更新。
内网可通过 `-Source` / `SCENARIO_TEST_SOURCE`（脚本）或 `--source`（ensure-runtime）改用制品目录。

## 发布步骤

1. 修改 `package.json` 版本号，遵循语义化版本；同步更新：
   - `package-lock.json`
   - `CHANGELOG.md`（新增 `## [X.Y.Z] - YYYY-MM-DD` 段）
   - `scripts/install.ps1` 的 `$ScenarioTestVersion` 与示例 URL
   - `scripts/install.sh` 的 `SCENARIO_TEST_VERSION` 与示例 URL
   - `skills/scenario-test/SKILL.md` 的 `metadata.version`（运行时版本以它为准）
   - `README.md` 中固定 Tag 的 Skill 安装命令与安装脚本 URL

   ```powershell
   npm run build
   # 确认 src/version.generated.js 与 dist/ 内嵌版本号一致
   ```

2. 本地验证：

   ```powershell
   npm test                    # 自动先构建；应全绿
   npm run test:e2e            # 安装链 + 执行链（真实跑安装脚本）
   npm run build:runtime
   npm run verify:release      # 按真实下载路径自检发布包
   npm audit                   # 期望 0 vulnerabilities
   ```

3. 提交版本变更并推送 `master`。

4. 创建并推送同名 Tag：

   ```powershell
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push origin vX.Y.Z
   ```

5. **CI 自动发布**：`.github/workflows/release.yml` 在 tag 推送后
   构建 → 校验产物完整性 → 校验 tag 与 `package.json` 一致 → 跑测试 →
   打包 → 自检 → `gh release create` 并挂上两个资产。

   观察进度：

   ```powershell
   gh run watch
   gh release view vX.Y.Z
   ```

6. 验证发布（三处必须一致）：

   ```powershell
   gh release view vX.Y.Z --json tagName,isDraft,isPrerelease,assets
   # 两个资产都应存在且可下载：
   # https://github.com/duyiliu/scenario-test/releases/download/vX.Y.Z/scenario-test-runtime-vX.Y.Z.tar.gz
   # .../scenario-test-runtime-vX.Y.Z.tar.gz.sha256
   ```

   再从干净目录实装一次，确认端到端可用：

   ```powershell
   irm https://raw.githubusercontent.com/duyiliu/scenario-test/vX.Y.Z/scripts/install.ps1 | iex
   ```

已发布 Tag 不覆盖重推、Release 资产不替换。修复必须发布新的 patch 版本。

## 打包内容

`scripts/build-runtime.mjs` 从 `dist/` 取 6 个文件，加上现算的 `release.json`：

| 文件 | 来源 |
| --- | --- |
| `scenario-test-cli.cjs` | esbuild（`src/cli.js`） |
| `scenario-test.umd.js` | esbuild（`src/index.js`，浏览器工作台） |
| `scenario-test.d.ts` | `scripts/generate-dts.mjs`（contract 投影） |
| `scenario-test-capabilities.json` | `buildCapabilities(contract)` |
| `AI_SCENARIO_PROMPT.md` | `init-templates.js` 的 `AUTHORING_PROMPT` |
| `SCENARIO_PATTERNS.md` | `init-templates.js` 的 `SCENARIO_PATTERNS` |
| `release.json` | 上述 6 个文件的 SHA-256 + 版本 + Release URL |

包是确定性构建：条目排序固定、mtime/uid/gid 归零、gzip level 9。同一份 `dist/`
重复打包得到逐字节相同的 tar.gz，sidecar 哈希可复现。

> 两份 AI 规则 md 自 v0.16.0 起随构建进入 `dist/`。此前它们只存在于已提交的
> Skill `runtime/` 副本里，而安装脚本按 `dist/` 下载，导致 v0.15.0 起安装链 404 中断。

## 内网分发

在任意 checkout 上生成制品：

```powershell
npm ci
npm run build
npm run build:runtime
```

把 `release/` 下两个文件放到内网 HTTP 目录 `<base>/`，用户侧：

```powershell
.\install.ps1 -Source "<base>"
node <Skill目录>/scripts/ensure-runtime.mjs --source "<base>"
```

内网目录缺 `.sha256` 时脚本警告并跳过整包校验，但包内 `release.json` 的逐文件校验仍会执行。

## 运行时目录约定

```
~/.scenario-test/
  runtime/
    X.Y.Z/                  ← 一个版本一个目录，并存不覆盖
      scenario-test-cli.cjs
      scenario-test.umd.js
      scenario-test.d.ts
      scenario-test-capabilities.json
      AI_SCENARIO_PROMPT.md
      SCENARIO_PATTERNS.md
      release.json
  projects.json             ← 工作台端口登记（CLI 管理）
```

Skill 的运行时版本唯一取自 `SKILL.md` 的 `metadata.version`，与 SKILL 同版本安装，
避免"Skill 是 0.16.0、运行时是 0.15.0"的错配。升级 Skill 后旧版本目录保留，可直接回退；
`runtime/` 下多余版本可随时删除，下次使用会重新下载。

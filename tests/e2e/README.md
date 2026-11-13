# 确定性发布消费链 E2E

对「安装脚本 → 运行时下载 → SHA-256 校验 → 用户级运行时落盘 → init → doctor → run → 报告产物」全链做**确定性**端到端验证。闭合覆盖矩阵缺口 G8 的确定性段。

## 定位与分工

- **本目录（`tests/e2e/`）**：确定性段。真实执行 `install.sh` / `install.ps1`，只走 `127.0.0.1` 本地静态源与 `os.tmpdir()` 临时目录，无外网、无 LLM、无 Docker。接入 CI（`e2e` job：ubuntu-24.04 + windows-latest）。
- **`tests/skill-e2e/`**：LLM 接入-执行冒烟（真实发布链路）。仅在 192.168.1.214 手动执行，G8 的 LLM 段仍属未验证。本目录不替代它。

## 运行

```bash
npm run build        # 被测产物必须是当前 checkout 构建的 dist/
npm run test:e2e     # 枚举 tests/e2e/*.test.mjs
```

## 结构

- `helpers/static-source.mjs` — 本地"CDN"：serve `dist/` + `skills/.../runtime/` 的 6 个运行时文件，实时算 SHA-256 动态生成 `release.json`；支持按文件篡改（负向用例）。
- `helpers/fixture-api.mjs` — 零依赖业务 API（login/orders 建查删），行为对齐 `tests/skill-e2e/java-springboot` 契约。
- `helpers/proc.mjs` — spawn 封装（超时/输出采集）、平台脚本选择（unix→`bash install.sh`，windows→`pwsh/powershell install.ps1`）、`HOME`/`USERPROFILE` 隔离。
- `project/scenarios/` — 消费工程场景夹具；`scenario.config.js` 由 `run-chain` 按 fixture 实际端口生成。

## 隔离与安全

- 安装脚本把用户级运行时落在 `HOME`/`USERPROFILE` 下——E2E 用子进程 env 把这两个变量指向 `os.tmpdir()` 临时目录，**绝不写真实用户目录**。
- 一切下载/请求走 `127.0.0.1` 随机端口；`SCENARIO_TEST_RELEASE_JSON` 指向本地清单。
- 测试结束清理临时目录与本地服务；`git status` 应保持干净。

## 平台契约

每个用例按 `process.platform` 分发到对应安装脚本；非本平台的用例 `test.skip` 并明示原因。CI 矩阵（ubuntu + windows）保证每个脚本在其原生平台被执行——不产生"全平台 skip"的假绿。

# skill E2E 测试（Java / Python / 前端）

在**干净 Docker 环境**验证 `skills/scenario-test` 的完整链路：

探测 → 自动初始化（官方固定 tag 安装脚本）→ doctor → 生成场景 → 执行。

## 目录

- `python/`：Python 标准库实现的只读查询 API（`app.py`，端口 18081）
- `java-springboot/`：Spring Boot 3.3 鉴权 + 订单 API（端口 18080）
- `web-static/`：纯前端项目画像（登录页 + 订单列表，`app.py` 同源托管，端口 18082）——**链路冒烟**：`init --e2e` 托管链路能否走通
- `web-vue3/`：工程化前端画像（Vue3 SFC + vue-router + vite 代理，前端 18085 / API 18084）——**真实 SPA 难点**：异步挂载、路由守卫、localStorage token（认证适配器应注入而非点 UI）、代理环境、轮询断言
- `web-existing/`：同一应用但前端已自管 Playwright（`e2e/` 无 `scenarioTestE2e` 标记，端口 18083）——验证挂载语义：init 不混入模板、e2e/ 目录 sha256 不变（脚本内置守卫）、HTTP 场景共存
- `docker/`：pi 镜像定义、目标 API 启动与 agent 执行脚本

## 前置条件

- Linux 主机上的 Docker（脚本使用 `--network host`）
- 本机已配置 pi 模型（`~/.pi/agent` 下有 `auth.json`/`models.json`/`settings.json`）；脚本会挂载该目录，**凭据不进入仓库**
- 本仓库的 skill 目录（默认自动定位 `../../skills/scenario-test`，可用 `SKILL_DIR` 覆盖）

## 运行

```bash
bash tests/skill-e2e/docker/run-python-test.sh
bash tests/skill-e2e/docker/run-java-test.sh
# 前端画像需要带 Playwright 的镜像（首次构建较慢）
bash tests/skill-e2e/docker/run-web-static-test.sh
bash tests/skill-e2e/docker/run-vue3-test.sh
bash tests/skill-e2e/docker/run-web-existing-test.sh
```

脚本会：

1. 构建/复用 `pi-agent:1.4.0` 镜像（node 22 + pi，无 scenario-test 预装）；前端画像用 `pi-agent-e2e:1.4.0-node22`（另含 Playwright 1.55.1 + Chromium，见 `docker/Dockerfile.pi-e2e`）
2. 启动目标 API 容器
3. 把测试项目复制到临时目录，在干净工作区加载 skill
4. 让 pi 自动接入并生成/执行场景
5. 结束后清理容器与临时目录

## 预期结果

- **Python**：4 个只读场景全部通过（health / 用户详情 / 用户列表 / 未知路径 404）
- **Java**：登录、错误凭据、用户详情、无 token 401、订单建-查-删-验 404 全部通过（约 11 步）
- **web-static（纯前端画像·冒烟）**：走 `init --e2e` 托管链路；不生成 HTTP 场景模板；4 条浏览器 E2E 全部通过（访客态/错误凭据/登录见列表/退出登录），`E2E_BROWSER_CHANNEL=chromium`（容器内无 Chrome）
- **web-vue3（工程化前端）**：除 web-static 的 4 条外，额外验证路由守卫重定向、异步渲染轮询断言（禁 `waitForTimeout`）、认证适配器经 API 注入 localStorage 而非表单点登录
- **web-existing（挂载语义）**：前端自管 `e2e/` 文件指纹前后一致（脚本守卫 FAIL 即失败）；HTTP 场景在 `scenarios/` 正常生成并通过；agent 明确说明未改动前端 e2e/
- 版本锁应为当前发布版（runtime 0.9.1 / contract 17 起）
- 场景应使用项目 `capabilities` 中支持的能力（如 `shape`/`each`/`tags`），不发明字段

> 挂载语义（web-existing）对应当前 master 尚未发布的 P0 改造（`docs/e2e-strategy.md` 第 10 节）：
> 在 P0 落地前运行该夹具，预期 agent 仍按现状报“检测到已有自管 e2e 目录”并只生成 HTTP 场景——
> 指纹守卫此时也应当 PASS（不写入），但“共存执行”两条预期会不满足。该夹具同时用于验证 P0 前后的行为差异。

## 模型

默认 `deepseek-v4.1-flash`，可在 `docker/python-agent.sh`、`docker/java-agent.sh` 的 `--model` 参数中替换。

## 注意

- 脚本只在临时目录操作，不会修改仓库文件。
- 目标 API 通过 host 网络暴露 18080–18085，运行前请确认端口空闲（可用 `PORT=xxx` / `API_PORT=xxx` 覆盖前端夹具端口）。
- Windows 本机请用 WSL 或 Git Bash 执行；Docker Desktop 需支持 host 网络。

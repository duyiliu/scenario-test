# skill E2E 测试（Java / Python）

在**干净 Docker 环境**验证 `skills/scenario-test` 的完整链路：

探测 → 自动初始化（官方固定 tag 安装脚本）→ doctor → 生成场景 → 执行。

## 目录

- `python/`：Python 标准库实现的只读查询 API（`app.py`，端口 18081）
- `java-springboot/`：Spring Boot 3.3 鉴权 + 订单 API（端口 18080）
- `docker/`：pi 镜像定义、目标 API 启动与 agent 执行脚本

## 前置条件

- Linux 主机上的 Docker（脚本使用 `--network host`）
- 本机已配置 pi 模型（`~/.pi/agent` 下有 `auth.json`/`models.json`/`settings.json`）；脚本会挂载该目录，**凭据不进入仓库**
- 本仓库的 skill 目录（默认自动定位 `../../skills/scenario-test`，可用 `SKILL_DIR` 覆盖）

## 运行

```bash
bash tests/skill-e2e/docker/run-python-test.sh
bash tests/skill-e2e/docker/run-java-test.sh
```

脚本会：

1. 构建/复用 `pi-agent:1.4.0` 镜像（node 22 + pi，无 scenario-test 预装）
2. 启动目标 API 容器
3. 把测试项目复制到临时目录，在干净工作区加载 skill
4. 让 pi 自动接入并生成/执行场景
5. 结束后清理容器与临时目录

## 预期结果

- **Python**：4 个只读场景全部通过（health / 用户详情 / 用户列表 / 未知路径 404）
- **Java**：登录、错误凭据、用户详情、无 token 401、订单建-查-删-验 404 全部通过（约 11 步）
- 版本锁应为当前发布版（runtime 0.9.1 / contract 17 起）
- 场景应使用项目 `capabilities` 中支持的能力（如 `shape`/`each`/`tags`），不发明字段

## 模型

默认 `deepseek-v4.1-flash`，可在 `docker/python-agent.sh`、`docker/java-agent.sh` 的 `--model` 参数中替换。

## 注意

- 脚本只在临时目录操作，不会修改仓库文件。
- 目标 API 通过 host 网络暴露 18080/18081，运行前请确认端口空闲。
- Windows 本机请用 WSL 或 Git Bash 执行；Docker Desktop 需支持 host 网络。

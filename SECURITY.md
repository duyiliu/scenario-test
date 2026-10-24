# scenario-test 安全指南

## ⚠️ 重要安全警告

### 场景文件是可执行代码

**风险**: 场景配置文件和场景定义文件使用 `vm.runInContext` 在 Node.js 中执行。虽然有上下文隔离，但**不是安全沙箱**（注入的宿主对象可经 `constructor` 链逃逸）。代码中的路径校验用于防误操作，不构成针对恶意配置的防线——**配置即代码，只运行可信来源的配置与场景**。

**影响**:
- 场景文件可以访问文件系统（读写任意文件）
- 场景文件可以发起网络请求
- 场景文件可以访问环境变量（包括敏感凭据）

**最佳实践**:
1. ✅ **只加载信任的场景文件**
2. ✅ **审查所有场景文件的来源**
3. ✅ **使用代码审查流程验证新场景**
4. ❌ **不要从公共来源直接下载未审查的场景**
5. ❌ **不要让终端用户上传场景文件**

---

## 🔒 安全改进 (v0.3.0)

### 1. 路径遍历防护

**问题**: 旧版本允许通过 `..` 访问工作区外的文件。

**修复**: 所有文件操作现在都经过路径验证。

```javascript
// ❌ 旧版本 - 不安全
{
  saveResponseAs: "../../../etc/passwd"  // 可以写出到系统文件
}

// ✅ 新版本 - 安全
// 抛出错误: "响应保存路径不安全: ../../../etc/passwd"
```

### 2. 环境变量授权

**问题**: `--authorization` 参数在进程列表中可见。

**修复**: 推荐使用环境变量。

```bash
# ❌ 旧方式（不推荐，但仍可用）
npx @yc_yzkj/scenario-test --authorization "Bearer token"

# ✅ 新方式（推荐）
export SCENARIO_AUTH="Bearer token"
npx @yc_yzkj/scenario-test --config scenario.config.js
```

### 3. 插件路径限制

**问题**: 可以加载任意路径的插件。

**修复**: 插件必须在配置目录内，或明确允许外部插件。

```javascript
// ✅ 安全：相对路径
{
  plugins: ["./plugins/custom-adapter.js"]
}

// ❌ 需要标志：外部路径
// 需要 --allow-external-plugins
{
  plugins: ["/tmp/external-plugin.js"]
}
```

### 4. 环境变量名遮蔽

**问题**: 错误消息泄露环境变量名。

**修复**: 生产模式不显示环境变量名。

```javascript
// ❌ 旧版本
// 错误: "缺少场景变量 PROD_API_SECRET（映射到 vars.apiSecret）"

// ✅ 新版本（生产模式）
// 错误: "缺少必需的场景变量: vars.apiSecret"
```

开发模式可设置 `SCENARIO_VERBOSE_ERRORS=true` 查看详细信息。

### 5. Runtime Vars 的受控管理

**问题**: vars 可能被意外声明或覆盖。

**防护**:
- `runId` / `runNo` 是引擎自动生成的保留变量，禁止在 vars / envVars / generatedVars / extract 中声明或覆盖（定义期即报错）。
- vars 由引擎在执行前统一构建：场景 vars、配置/选项 vars、envVars、generatedVars 按优先级合并。
- 执行期 `extract` 是 vars 的唯一写入方；场景文件与插件不应直接修改 runtime.vars，该行为不受支持并可能在后续版本被拒绝。

```javascript
// ❌ 不支持：场景/插件直接修改 runtime.vars
runtime.vars.apiKey = "hacked";
```

### 6. 重试超时保护

**问题**: 无限重试可能消耗资源。

**修复**: 添加默认 5 分钟超时和最小间隔。

```javascript
{
  retryUntil: {
    maxAttempts: 10,
    intervalMs: 2000,
    maxElapsedMs: 300000  // 5 分钟（可选）
  }
}
```

---

## 🖥️ serve 工作台的本地暴露面

`serve` 是**本地联调工具**，按以下模型设计，使用前请确认与你的环境匹配：

- 服务只绑定 `127.0.0.1`，并校验 `Host` 头（仅放行本机回环域名，伪造 Host 的请求返回 403，可阻断 DNS rebinding 读取）。
- 同源接口代理会放宽上游 https 证书校验（接受自签证书，等价 `rejectUnauthorized: false`），仅应用于本机联调的代理连接；上游空闲 30 秒即断开。
- **同机任意进程**（包括其他用户会话下的进程）都能访问该端口，并读取工作区内的静态文件——包括 `scenario.config.js`。**不要在配置里放生产凭据**；联调凭据用完即清（工作台"清除当前环境覆盖"或手动清理 localStorage）。
- 工作台的场景加载有配置清单白名单（`?scenario=` 只接受 config 中列出的场景文件），但清单内的场景文件本身仍是可执行代码。
- 浏览器本地存储（localStorage）中的环境变量/凭据为明文，仅适合受控联调环境。

---

## 🛡️ 安全最佳实践

### 凭据管理

#### ❌ 不要硬编码凭据

```javascript
// ❌ 危险
{
  vars: {
    apiKey: "AK_1234567890",  // 会提交到 Git
    apiSecret: "SK_9876543210"
  }
}
```

#### ✅ 使用环境变量

```javascript
// ✅ 安全
{
  vars: {
    apiKey: process.env.API_KEY || "",
    apiSecret: process.env.API_SECRET || ""
  },
  variables: [
    { name: "apiKey", label: "API Key", env: "API_KEY", required: true },
    { name: "apiSecret", label: "API Secret", env: "API_SECRET", required: true }
  ]
}
```

### 文件操作

所有文件路径必须在工作区内：

```javascript
// ✅ 安全
{
  saveResponseAs: "output/result.txt"  // 相对路径
}

// ❌ 会被拒绝
{
  saveResponseAs: "/etc/passwd"           // 绝对路径
}

// ❌ 会被拒绝（路径遍历）
{
  saveResponseAs: "../../../tmp/file.txt" // 越界
}
```

### 插件使用

仅使用可信插件：

```bash
# ✅ 项目内插件
npx @yc_yzkj/scenario-test --config scenario.config.js

# ⚠️ 外部插件（需要明确允许）
npx @yc_yzkj/scenario-test --config scenario.config.js --allow-external-plugins
```

---

## 📝 安全审计清单

在发布/部署前检查：

- [ ] 配置文件中没有硬编码凭据
- [ ] 所有文件路径都是相对路径
- [ ] 使用环境变量传递敏感信息
- [ ] 场景文件已经过代码审查
- [ ] 插件来源可信
- [ ] 示例代码中没有真实的 API 密钥
- [ ] `.env` 文件已加入 `.gitignore`

---

## 🔍 漏洞报告

如果发现安全漏洞，请通过以下方式报告：

1. **不要**在公开 issue 中披露
2. 发送邮件到项目维护者
3. 包含详细的重现步骤
4. 我们会在 48 小时内响应

---

## 📚 参考资源

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE-22: Path Traversal](https://cwe.mitre.org/data/definitions/22.html)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

# E2E 消费工程夹具

`scenarios/` 内存放被「真实安装出来的工程」执行的场景文件。
`scenario.config.js` 不写死——它要引用 fixture-api 的随机端口，
由 `run-chain.test.mjs` 在测试运行时按实际端口生成到已 init 的工程目录。

- `order-flow.js`：登录 → 鉴权用户 → 订单建/查/删/删除后 404（正例，全 PASS）。
- `bad-login.js`：故意断言失败（反例，验证失败路径 exit 非零）。

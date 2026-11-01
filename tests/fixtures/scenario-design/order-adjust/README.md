# order-adjust

订单调整单服务。商家提交调整申请（改数量），运营审批后生效，并通知结算域重算金额。

## 技术栈

- Java 17 / Spring Boot 3.3
- 无数据库：`OrderAdjustRepository` 为内存实现，语义对齐生产库表 `order_adjust`
  （`request_id` 上有唯一索引）

## 目录

```
src/main/java/com/example/order/
├── OrderAdjustController.java      REST 入口
├── OrderAdjustService.java         业务规则集中处
├── OrderAdjustRequest.java         创建请求体（含 Bean Validation）
├── OrderAdjust.java                调整单实体
├── OrderAdjustStatus.java          状态枚举
├── Order.java                      原订单（只读，可调数量由履约系统同步）
├── OrderRepository.java            演示订单数据
├── OrderAdjustRepository.java      调整单存储
├── SettlementClient.java           结算域 RPC（外部依赖）
├── Result.java                     统一响应包装
├── ErrorCode.java                  错误码
├── BizException.java               业务异常
└── GlobalExceptionHandler.java     全局异常处理
docs/API.md                         接口与错误码说明
```

## 本地运行

```bash
mvn spring-boot:run
```

默认端口 8080。

## 接口

见 [docs/API.md](docs/API.md)。

## 场景测试

`scenario-test/` 下已接入 scenario-test，当前只有一条订单调整单创建场景。

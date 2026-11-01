# 订单调整单 API

基础路径：`/api/order-adjusts`

## 通用约定

- **所有响应（含业务失败）HTTP 状态码均为 `200`**。成功与否只看响应体的 `code`：
  - `code = 0` 成功，业务数据在 `data`
  - `code != 0` 失败，`data` 为 `null`，`message` 为错误描述
- 请求与响应均为 `application/json`。
- 失败响应示例：

```json
{ "code": 40901, "message": "调整数量超过可调上限", "data": null }
```

## 错误码

错误码来源为 `com.example.order.ErrorCode`，与 `GlobalExceptionHandler` 的映射一致。

| code | 含义 | 触发条件 |
| --- | --- | --- |
| 40001 | 调整数量必须大于 0 | `quantity` 为空、0 或负数 |
| 40401 | 原订单不存在 | `orderId` 在订单库中查不到 |
| 40402 | 调整单不存在 | 按 id 查询或审批时不存在 |
| 40901 | 调整数量超过可调上限 | `quantity > 原订单可调数量` |
| 40903 | 当前状态不允许该操作 | 非 `PENDING` 状态执行审批 |

## 创建调整单

`POST /api/order-adjusts`

请求体：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| orderId | number | 是 | 原订单 id |
| quantity | number | 是 | 调整数量，必须 > 0 且 ≤ 原订单可调数量 |
| requestId | string | 是 | 幂等键，同一业务意图重试时必须复用 |

成功响应：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 9001,
    "orderId": 1001,
    "requestId": "req-20260101-001",
    "quantity": 2,
    "status": "PENDING",
    "operator": null,
    "createdAt": "2026-01-01T10:00:00"
  }
}
```

`status` 枚举：`PENDING` / `APPROVED` / `CANCELLED`。

## 查询调整单详情

`GET /api/order-adjusts/{id}`

不存在时返回 `code = 40402`。

## 审批调整单

`POST /api/order-adjusts/{id}/approve`

仅 `PENDING` 状态可审批，成功后 `status` 变为 `APPROVED`。
非 `PENDING` 状态调用返回 `code = 40903`，状态保持不变。

## 按原订单查询调整单列表

`GET /api/order-adjusts?orderId={orderId}`

响应：

```json
{ "code": 0, "message": "ok", "data": { "list": [], "total": 0 } }
```

## 演示数据

| orderId | orderNo | 数量 | 可调数量 |
| --- | --- | --- | --- |
| 1001 | SO20260101001 | 20 | 10 |
| 1002 | SO20260101002 | 5 | 0 |
| 1003 | SO20260101003 | 8 | 3 |

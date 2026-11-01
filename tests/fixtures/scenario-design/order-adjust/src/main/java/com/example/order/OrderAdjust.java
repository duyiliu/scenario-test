package com.example.order;

import java.time.LocalDateTime;

/**
 * 订单调整单。
 *
 * {@code requestId} 是调用方生成的幂等键：同一 requestId 重复提交时服务端只保留首条记录，
 * 后续请求直接返回首条记录（见 {@link OrderAdjustService#create}）。
 */
public class OrderAdjust {

    private Long id;
    private Long orderId;
    private String requestId;
    private Integer quantity;
    private OrderAdjustStatus status;
    private String operator;
    private LocalDateTime createdAt;

    public OrderAdjust() {
    }

    public OrderAdjust(Long id, Long orderId, String requestId, Integer quantity, OrderAdjustStatus status) {
        this.id = id;
        this.orderId = orderId;
        this.requestId = requestId;
        this.quantity = quantity;
        this.status = status;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public Long getOrderId() {
        return orderId;
    }

    public String getRequestId() {
        return requestId;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public OrderAdjustStatus getStatus() {
        return status;
    }

    public void setStatus(OrderAdjustStatus status) {
        this.status = status;
    }

    public String getOperator() {
        return operator;
    }

    public void setOperator(String operator) {
        this.operator = operator;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}

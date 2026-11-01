package com.example.order;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * 创建调整单的请求体。
 *
 * {@code quantity} 的下界由 Bean Validation 先行拦截，Service 内还有一次显式校验作为兜底，
 * 两处都收敛到 {@link ErrorCode#QUANTITY_INVALID}（40001）。
 */
public class OrderAdjustRequest {

    @NotNull(message = "orderId 不能为空")
    private Long orderId;

    /** 调整数量：必须大于 0，且不超过原订单当前可调上限。 */
    @NotNull(message = "quantity 不能为空")
    @Min(value = 1, message = "调整数量必须大于 0")
    private Integer quantity;

    /** 幂等键。调用方为每次「业务意图」生成唯一值，重试时必须复用同一个值。 */
    @NotBlank(message = "requestId 不能为空")
    private String requestId;

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public String getRequestId() {
        return requestId;
    }

    public void setRequestId(String requestId) {
        this.requestId = requestId;
    }
}

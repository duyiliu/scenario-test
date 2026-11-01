package com.example.order;

/**
 * 原订单。可调上限由履约系统同步而来，本服务只读。
 */
public class Order {

    private Long id;
    private String orderNo;
    private Long skuId;
    private Integer quantity;

    /** 当前可调数量。调整单的 quantity 不得超过该值。 */
    private Integer adjustableQuantity;

    public Order() {
    }

    public Order(Long id, String orderNo, Long skuId, Integer quantity, Integer adjustableQuantity) {
        this.id = id;
        this.orderNo = orderNo;
        this.skuId = skuId;
        this.quantity = quantity;
        this.adjustableQuantity = adjustableQuantity;
    }

    public Long getId() {
        return id;
    }

    public String getOrderNo() {
        return orderNo;
    }

    public Long getSkuId() {
        return skuId;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public Integer getAdjustableQuantity() {
        return adjustableQuantity;
    }
}

package com.example.order;

/** 调整单状态。审批只允许从 PENDING 出发，其余状态一律拒绝。 */
public enum OrderAdjustStatus {

    /** 待审批。创建后的初始状态。 */
    PENDING,

    /** 已审批。 */
    APPROVED,

    /** 已取消。 */
    CANCELLED
}

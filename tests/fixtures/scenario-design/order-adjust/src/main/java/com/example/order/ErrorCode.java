package com.example.order;

/**
 * 订单调整单错误码。
 *
 * 全仓唯一的错误码事实来源。对外响应中的 {@code code} 字段即本枚举的 code，
 * 描述与 docs/API.md 的「错误码」表格保持一致，改动时必须同步。
 */
public enum ErrorCode {

    /** 调整数量非法：为空、0 或负数。 */
    QUANTITY_INVALID(40001, "调整数量必须大于 0"),

    /** 原订单不存在或已删除。 */
    ORDER_NOT_FOUND(40401, "原订单不存在"),

    /** 调整单不存在。 */
    ADJUST_NOT_FOUND(40402, "调整单不存在"),

    /** 调整数量超过原订单当前可调上限。 */
    ADJUST_QUANTITY_EXCEEDED(40901, "调整数量超过可调上限"),

    /** 当前状态不允许该操作（如已审批的调整单再次审批）。 */
    INVALID_STATUS_TRANSITION(40903, "当前状态不允许该操作");

    private final int code;
    private final String message;

    ErrorCode(int code, String message) {
        this.code = code;
        this.message = message;
    }

    public int getCode() {
        return code;
    }

    public String getMessage() {
        return message;
    }
}

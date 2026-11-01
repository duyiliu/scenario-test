package com.example.order;

/** 业务异常。仅携带 {@link ErrorCode}，由 {@link GlobalExceptionHandler} 统一转换为响应。 */
public class BizException extends RuntimeException {

    private final ErrorCode errorCode;

    public BizException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }

    public ErrorCode getErrorCode() {
        return errorCode;
    }
}

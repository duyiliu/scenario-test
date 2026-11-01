package com.example.order;

/**
 * 统一响应包装。所有接口（含业务失败）都返回 HTTP 200，
 * 成功与失败仅由 {@code code} 区分：{@code code == 0} 为成功。
 *
 * 调用方必须先判断 code，不能只看 HTTP 状态。
 */
public class Result<T> {

    private int code;
    private String message;
    private T data;

    public Result() {
    }

    private Result(int code, String message, T data) {
        this.code = code;
        this.message = message;
        this.data = data;
    }

    public static <T> Result<T> ok(T data) {
        return new Result<>(0, "ok", data);
    }

    public static <T> Result<T> fail(ErrorCode errorCode) {
        return new Result<>(errorCode.getCode(), errorCode.getMessage(), null);
    }

    public int getCode() {
        return code;
    }

    public String getMessage() {
        return message;
    }

    public T getData() {
        return data;
    }
}

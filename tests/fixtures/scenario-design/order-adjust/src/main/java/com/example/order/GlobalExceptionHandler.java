package com.example.order;

import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * 全局异常处理：业务异常与参数校验异常统一转换为 HTTP 200 + 统一响应体。
 *
 * 注意：这里刻意不设置 HTTP 错误状态码。调用方只能通过 {@code code} 判断失败，
 * 所以「HTTP 200 即成功」的断言在本项目里恒为假绿。
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BizException.class)
    public Result<Void> handleBiz(BizException ex) {
        // 直接透出 ErrorCode 的 code 与 message，不再二次包装
        return Result.fail(ex.getErrorCode());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public Result<Void> handleValidation(MethodArgumentNotValidException ex) {
        // 字段级校验失败统一收敛到 QUANTITY_INVALID（40001）
        FieldError fieldError = ex.getBindingResult().getFieldError();
        if (fieldError != null && "quantity".equals(fieldError.getField())) {
            return Result.fail(ErrorCode.QUANTITY_INVALID);
        }
        return Result.fail(ErrorCode.QUANTITY_INVALID);
    }
}

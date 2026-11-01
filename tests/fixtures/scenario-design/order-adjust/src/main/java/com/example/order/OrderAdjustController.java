package com.example.order;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 订单调整单接口。
 *
 * 所有响应（含业务失败）均为 HTTP 200 + {@link Result}，失败信息在 {@code code} 字段。
 */
@RestController
@RequestMapping("/api/order-adjusts")
public class OrderAdjustController {

    private final OrderAdjustService orderAdjustService;

    public OrderAdjustController(OrderAdjustService orderAdjustService) {
        this.orderAdjustService = orderAdjustService;
    }

    /** 创建调整单。requestId 为幂等键。 */
    @PostMapping
    public Result<OrderAdjust> create(@Valid @RequestBody OrderAdjustRequest request) {
        return Result.ok(orderAdjustService.create(request));
    }

    /** 审批调整单。仅 PENDING 可审批。 */
    @PostMapping("/{id}/approve")
    public Result<OrderAdjust> approve(@PathVariable long id) {
        return Result.ok(orderAdjustService.approve(id));
    }

    /** 查询调整单详情。 */
    @GetMapping("/{id}")
    public Result<OrderAdjust> detail(@PathVariable long id) {
        return Result.ok(orderAdjustService.get(id));
    }

    /** 按原订单查询调整单列表。 */
    @GetMapping
    public Result<Map<String, Object>> list(@RequestParam long orderId) {
        List<OrderAdjust> list = orderAdjustService.listByOrderId(orderId);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("list", list);
        data.put("total", list.size());
        return Result.ok(data);
    }
}

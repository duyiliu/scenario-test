package com.example.order;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

/**
 * 调整单存储（演示用的内存实现，等同于生产库表 order_adjust）。
 *
 * 生产库表在 request_id 上有唯一索引；本实现在 {@link #save} 前先按键查重，
 * 语义一致。
 */
public class OrderAdjustRepository {

    private final AtomicLong idSeq = new AtomicLong(9000);
    private final Map<Long, OrderAdjust> byId = new ConcurrentHashMap<>();
    private final Map<String, Long> idByRequestId = new ConcurrentHashMap<>();

    /**
     * 按幂等键查找。命中说明该 requestId 已被受理过，调用方应直接返回已有记录。
     */
    public Optional<OrderAdjust> findByRequestId(String requestId) {
        if (requestId == null) {
            return Optional.empty();
        }
        Long id = idByRequestId.get(requestId);
        return id == null ? Optional.empty() : Optional.ofNullable(byId.get(id));
    }

    public Optional<OrderAdjust> findById(Long id) {
        return id == null ? Optional.empty() : Optional.ofNullable(byId.get(id));
    }

    /** 查询某原订单下的全部调整单，用于验证「拒绝后未落单」。 */
    public List<OrderAdjust> findByOrderId(Long orderId) {
        return byId.values().stream()
                .filter(adjust -> orderId != null && orderId.equals(adjust.getOrderId()))
                .sorted((a, b) -> Long.compare(a.getId(), b.getId()))
                .collect(Collectors.toList());
    }

    public OrderAdjust save(OrderAdjust adjust) {
        adjust = new OrderAdjust(idSeq.incrementAndGet(), adjust.getOrderId(),
                adjust.getRequestId(), adjust.getQuantity(), adjust.getStatus());
        byId.put(adjust.getId(), adjust);
        idByRequestId.put(adjust.getRequestId(), adjust.getId());
        return adjust;
    }

    public void clear() {
        byId.clear();
        idByRequestId.clear();
    }
}

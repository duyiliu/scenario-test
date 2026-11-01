package com.example.order;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 原订单存储（只读）。演示数据在构造时初始化，等同于上游履约系统的同步结果。
 */
public class OrderRepository {

    private final Map<Long, Order> orders = new ConcurrentHashMap<>();

    public OrderRepository() {
        // 演示订单：1001 可调 10 件；1002 可调 0 件（不可调整）；1003 可调 3 件
        orders.put(1001L, new Order(1001L, "SO20260101001", 501L, 20, 10));
        orders.put(1002L, new Order(1002L, "SO20260101002", 502L, 5, 0));
        orders.put(1003L, new Order(1003L, "SO20260101003", 503L, 8, 3));
    }

    public Optional<Order> findById(Long id) {
        return id == null ? Optional.empty() : Optional.ofNullable(orders.get(id));
    }
}

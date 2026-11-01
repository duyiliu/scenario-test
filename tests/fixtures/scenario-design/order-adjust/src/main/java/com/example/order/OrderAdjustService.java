package com.example.order;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 订单调整单领域服务。所有业务规则集中在此处，Controller 不做业务判断。
 */
@Service
public class OrderAdjustService {

    private static final Logger log = LoggerFactory.getLogger(OrderAdjustService.class);

    private final OrderRepository orderRepository;
    private final OrderAdjustRepository adjustRepository;
    private final SettlementClient settlementClient;

    public OrderAdjustService(OrderRepository orderRepository,
                              OrderAdjustRepository adjustRepository,
                              SettlementClient settlementClient) {
        this.orderRepository = orderRepository;
        this.adjustRepository = adjustRepository;
        this.settlementClient = settlementClient;
    }

    /**
     * 创建调整单。
     *
     * 规则顺序不可调整：
     * <ol>
     *   <li>幂等优先：同一 requestId 已受理过时直接返回首条记录，<b>不新建第二条</b>，
     *       也不覆盖首条记录的数量/状态。即使本次请求的 quantity 与首次不同，仍返回首次结果。</li>
     *   <li>原订单必须存在。</li>
     *   <li>调整数量必须大于 0（Bean Validation 之外的服务端兜底）。</li>
     *   <li>调整数量不得超过原订单当前可调数量，超限时<b>不写入任何记录</b>。</li>
     *   <li>写入后状态固定为 PENDING。</li>
     *   <li>通知结算域重算金额：best-effort，失败只记日志，不影响本次受理结果，
     *       本地环境无结算服务故必然失败（见 {@link SettlementClient}）。</li>
     * </ol>
     */
    @Transactional
    public OrderAdjust create(OrderAdjustRequest request) {
        return adjustRepository.findByRequestId(request.getRequestId())
                .orElseGet(() -> doCreate(request));
    }

    private OrderAdjust doCreate(OrderAdjustRequest request) {
        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new BizException(ErrorCode.ORDER_NOT_FOUND));

        if (request.getQuantity() == null || request.getQuantity() <= 0) {
            throw new BizException(ErrorCode.QUANTITY_INVALID);
        }
        if (request.getQuantity() > order.getAdjustableQuantity()) {
            // 先校验后落单：此处抛出时库中不会留下任何调整单记录
            throw new BizException(ErrorCode.ADJUST_QUANTITY_EXCEEDED);
        }

        OrderAdjust adjust = adjustRepository.save(new OrderAdjust(
                null, order.getId(), request.getRequestId(), request.getQuantity(), OrderAdjustStatus.PENDING));

        try {
            settlementClient.recalculate(order.getId());
        } catch (RuntimeException ex) {
            log.warn("结算金额重算失败（best-effort，不影响调整单受理） orderId={}", order.getId(), ex);
        }
        return adjust;
    }

    /**
     * 审批调整单。只有 PENDING 允许审批，其余状态一律拒绝且状态保持不变。
     */
    @Transactional
    public OrderAdjust approve(long id) {
        OrderAdjust adjust = adjustRepository.findById(id)
                .orElseThrow(() -> new BizException(ErrorCode.ADJUST_NOT_FOUND));
        if (adjust.getStatus() != OrderAdjustStatus.PENDING) {
            throw new BizException(ErrorCode.INVALID_STATUS_TRANSITION);
        }
        adjust.setStatus(OrderAdjustStatus.APPROVED);
        return adjust;
    }

    public OrderAdjust get(long id) {
        return adjustRepository.findById(id)
                .orElseThrow(() -> new BizException(ErrorCode.ADJUST_NOT_FOUND));
    }

    /** 按原订单查询调整单列表，用于验证「被拒请求未落单」与「重复提交未产生第二条」。 */
    public List<OrderAdjust> listByOrderId(long orderId) {
        return adjustRepository.findByOrderId(orderId);
    }
}

package com.example.order;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * 结算服务的本地实现：没有可用的上游，调用必然失败。
 * 与 {@link SettlementClient} 的约定一致——失败只记日志，不影响调整单受理。
 */
@Component
public class LocalSettlementClient implements SettlementClient {

    private static final Logger log = LoggerFactory.getLogger(LocalSettlementClient.class);

    @Override
    public boolean recalculate(Long orderId) {
        log.warn("结算服务不可达，跳过金额重算 orderId={}", orderId);
        return false;
    }
}

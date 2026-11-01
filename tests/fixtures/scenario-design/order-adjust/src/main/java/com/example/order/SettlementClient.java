package com.example.order;

/**
 * 结算服务客户端（外部 RPC）。
 *
 * 由结算域提供，本服务只负责发起重算请求。本地开发环境没有该服务、也没有 mock，
 * 调用会失败；为避免影响主流程，本服务将重算视为 best-effort：
 * 失败仅记录告警日志，不回滚调整单。
 *
 * 因此「调整后的订单金额是否被正确重算」在本地无法观察，
 * 需要结算域提供的查询接口或联调环境才能验证。
 */
public interface SettlementClient {

    /** 按原订单重算结算金额。返回是否受理成功。 */
    boolean recalculate(Long orderId);
}

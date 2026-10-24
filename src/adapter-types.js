/**
 * 适配器协议验证
 * 
 * 简化版本，仅保留核心验证功能
 */

export function validateAdapter(adapter, name = "unknown") {
    const errors = [];
    
    if (!adapter || typeof adapter !== "object") {
        errors.push("适配器必须是对象");
    } else {
        // 必需方法
        if (typeof adapter.execute !== "function") {
            errors.push("缺少必需的 execute 方法");
        }
        
        // 可选方法的类型检查
        const optionalMethods = ["initialize", "matches", "beforeExecute", "afterExecute", "onError", "dispose"];
        for (const method of optionalMethods) {
            if (adapter[method] !== undefined && typeof adapter[method] !== "function") {
                errors.push(`${method} 必须是函数`);
            }
        }
    }
    
    if (errors.length > 0) {
        throw new TypeError(`适配器 ${name} 验证失败:\n${errors.map(e => `  - ${e}`).join("\n")}`);
    }
}

export function validateAdapterResponse(response, adapterName = "unknown") {
    if (!response || typeof response !== "object") {
        throw new TypeError(`适配器 ${adapterName} 返回值必须是对象`);
    }
    
    const actualResponse = response.response || response;
    
    if (actualResponse.status === undefined || actualResponse.status === null) {
        throw new TypeError(`适配器 ${adapterName} 响应缺少 status 字段`);
    }
    
    // headers 声明了就必须是非 null 对象：typeof null === "object"，
    // 仅靠 typeof 判型会把 null 放过（引擎层 response.headers || {} 会兜底，
    // 但校验层应如实拒绝而非静默改写适配器返回值）
    if (actualResponse.headers !== undefined
        && (actualResponse.headers === null || typeof actualResponse.headers !== "object")) {
        throw new TypeError(`适配器 ${adapterName} 响应的 headers 必须是对象`);
    }
    
    return true;
}
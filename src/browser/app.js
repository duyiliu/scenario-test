import { defineConfig, getConfig, getScenario } from "../registry.js";
import { createWorkbenchRuntime } from "./ui/runtime.js";
import { TAILWIND_CSS } from "./tailwind.generated.js";

function resolveMount(mount) {
    return typeof mount === "string" ? document.querySelector(mount) : mount;
}

function toRuntimeConfig(config) {
    const prefix = config.storagePrefix || "scenario-test";
    const scenarioVars = { ...(config.vars || {}) };
    for (const definition of config.variables || []) {
        if (scenarioVars[definition.name] === undefined && definition.defaultValue !== undefined) {
            scenarioVars[definition.name] = definition.defaultValue;
        }
    }
    return {
        ...config,
        scenarioVars,
        scenarios: config.scenarios.map((entry) => ({
            ...entry,
            file: entry.url || entry.file || entry.path || ""
        })),
        storageKeys: {
            baseUrl: `${prefix}.baseUrl`,
            authorization: `${prefix}.authorization`,
            globals: `${prefix}.globals`,
            environment: `${prefix}.environment`,
            theme: `${prefix}.theme`,
            scenarioVars: `${prefix}.scenarioVars`,
            pinnedScenarios: `${prefix}.pinnedScenarios`,
            scenarioListWidth: `${prefix}.scenarioListWidth`,
            ...(config.storageKeys || {})
        }
    };
}

function ensureTailwindStyles() {
    let style = document.getElementById("scenarioTailwindStyles");
    if (!style) {
        style = document.createElement("style");
        style.id = "scenarioTailwindStyles";
        style.textContent = TAILWIND_CSS;
        document.head.appendChild(style);
    }
    return style;
}

export function createApp(options = {}) {
    const mount = resolveMount(options.mount);
    if (!mount) throw new Error("createApp 缺少有效的 mount 容器");
    if (document.getElementById("scenario-test-root") && mount.id !== "scenario-test-root") {
        throw new Error("当前页面只能挂载一个场景测试工作台");
    }

    const config = defineConfig(options.config || getConfig() || {});
    const previousId = mount.id;
    mount.id = "scenario-test-root";
    mount.classList.add("scenario-test-root");
    ensureTailwindStyles();

    const runtime = createWorkbenchRuntime({ mount, config: toRuntimeConfig(config), getScenario });
    let destroyed = false;

    function loadScenario(idOrUrl) {
        const entry = config.scenarios.find((item) => item.id === idOrUrl || item.url === idOrUrl || item.file === idOrUrl);
        return runtime.loadScenario(entry ? (entry.url || entry.file) : idOrUrl);
    }

    function destroy() {
        if (destroyed) return;
        runtime.cancel();
        mount.replaceChildren();
        mount.classList.remove("scenario-test-root");
        mount.id = previousId;
        destroyed = true;
    }

    return {
        loadScenario,
        runAll: runtime.runAll,
        runNext: runtime.runNext,
        reset: runtime.reset,
        cancel: runtime.cancel,
        rewindToStep: runtime.rewindToStep,
        rerunStep: runtime.rerunStep,
        destroy,
        getState: runtime.getState
    };
}

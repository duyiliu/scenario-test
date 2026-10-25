export * from "./core.js";
export * from "./registry.js";
export * from "./engine.js";
export * from "./adapter-types.js";
export { contract, CONTRACT_VERSION } from "./contract.js";
export { VERSION } from "./version.generated.js";
export { buildCapabilities, renderCapabilitiesText } from "./capabilities.js";
export { createNodeIo } from "./node/io.js";
export { executeDefinitionFile, loadConfigFile, loadScenarioFile } from "./node/loader.js";

// Node 入口不打包浏览器工作台：导出面保留 createApp 形状（typeof 仍为 function），
// 调用时给明确报错而非「document is not defined」。真实实现在 browser/app.js，
// 经 index.js 只进 UMD/ESM 产物——cjs/cli 产物因此不再携带 UI 与 Tailwind 死代码。
export function createApp() {
    throw new Error("createApp 仅在浏览器环境可用；Node 入口不含浏览器工作台，请改用 dist/scenario-test.umd.js 或 scenario-test.esm.js");
}

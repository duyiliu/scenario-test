import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const result = spawnSync(process.execPath, ["tests/browser-comprehensive.test.mjs"], {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    env: { ...process.env, SCENARIO_TEST_BROWSER_RUNTIME: process.argv[2] === "dist" ? "dist" : "src" },
    stdio: "inherit"
});
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;

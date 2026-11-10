import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { createRequire } from "node:module";
import { randomUUID, createHash } from "node:crypto";
import { createE2eExtension } from "../src/e2e/extension.js";
import { E2E_REPORTER } from "../src/e2e/reporter-template.js";

const spec = "tests/a.spec.js";
const key = createHash("sha256").update(spec).digest("hex");
function setup(t) {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "e2e-results-"));
    const results = path.join(workspace, "e2e-results");
    const oldId = randomUUID();
    fs.mkdirSync(path.join(workspace, "e2e/tests"), { recursive: true });
    fs.mkdirSync(path.join(results, oldId), { recursive: true });
    fs.mkdirSync(path.join(results, "by-spec"));
    fs.writeFileSync(path.join(workspace, "e2e", spec), "");
    const previous = { spec, runId: oldId, startedAt: "2020-01-01T00:00:00.000Z" };
    fs.writeFileSync(path.join(results, "by-spec", `${key}.json`), JSON.stringify(previous));
    fs.writeFileSync(path.join(results, oldId, "manifest.json"), JSON.stringify({ runId: oldId, finishedAt: previous.startedAt, results: { [spec]: [{ status: "passed" }] } }));
    t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));
    return { workspace, results, previous };
}

test("枚举而未执行测试时，不更新历史通过索引", (t) => {
    const { workspace, results, previous } = setup(t);
    const managed = path.join(workspace, ".scenario-test");
    fs.mkdirSync(managed);
    const reporterFile = path.join(managed, "e2e-reporter.cjs");
    fs.writeFileSync(reporterFile, E2E_REPORTER);
    const Reporter = createRequire(import.meta.url)(reporterFile);
    const oldRun = process.env.E2E_RUN_ID;
    process.env.E2E_RUN_ID = randomUUID();
    t.after(() => { if (oldRun === undefined) delete process.env.E2E_RUN_ID; else process.env.E2E_RUN_ID = oldRun; });
    const reporter = new Reporter();
    reporter.onBegin({}, { allTests: () => [{ location: { file: path.join(workspace, "e2e", spec) } }] });
    reporter.onEnd({ status: "passed" });
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(results, "by-spec", `${key}.json`), "utf8")), previous);
});

test("全局启动失败且清单已结束但无测试结果时，返回本次失败而非历史通过", async (t) => {
    const { workspace, previous } = setup(t);
    const cli = path.join(workspace, "e2e/node_modules/@playwright/test/cli.js");
    fs.mkdirSync(path.dirname(cli), { recursive: true });
    fs.writeFileSync(cli, `const fs=require('node:fs'), path=require('node:path');
const id=process.env.E2E_RUN_ID, dir=path.resolve('../e2e-results',id);
fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({runId:id,finishedAt:new Date().toISOString(),status:'failed',results:{'tests/a.spec.js':[]}}));
console.error('global setup failed');process.exitCode=1;`);
    const extension = createE2eExtension({ workspace });
    const server = http.createServer((req, res) => extension.handle(req, res, new URL(req.url, "http://localhost").pathname));
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    t.after(async () => { await extension.dispose(); await new Promise((resolve) => server.close(resolve)); });
    const base = `http://127.0.0.1:${server.address().port}`;
    const started = await fetch(`${base}/e2e/api/run`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spec }) });
    assert.equal(started.status, 202);
    const { runId } = await started.json();
    assert.notEqual(runId, previous.runId);
    let running = true;
    for (let i = 0; i < 100 && running; i++) {
        running = (await (await fetch(`${base}/e2e/api/state`)).json()).running;
        if (running) await new Promise((resolve) => setTimeout(resolve, 30));
    }
    assert.equal(running, false);
    const manifest = await (await fetch(`${base}/e2e/api/result?spec=${encodeURIComponent(spec)}`)).json();
    assert.equal(manifest.runId, runId);
    assert.equal(manifest.results[spec][0].status, "failed");
    assert.match(manifest.logs[spec].join(""), /global setup failed/);
});

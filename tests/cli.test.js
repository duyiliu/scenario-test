import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";

// 本文件全部 CLI 子进程默认继承 process.env：剥离宿主 SCENARIO_* 变量，
// 防 SCENARIO_AUTH / SCENARIO_GLOBALS / SCENARIO_NO_BODY_PRINT 等改变被测进程行为；
// 需要这些变量的用例在各自 spawn env 中显式注入
for (const key of Object.keys(process.env)) {
    // Windows 环境变量查询不区分大小写——小写 scenario_no_body_print 同样生效，
    // 剥离判断必须大小写不敏感，否则宿主变量仍可穿透影响被测子进程
    if (key.toUpperCase().startsWith("SCENARIO_")) delete process.env[key];
}

test("CLI 从公共 JS 配置执行场景", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-cli-"));
    const server = http.createServer((request, response) => {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ status: "UP", token: request.headers["x-token"] }));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        const port = server.address().port;
        fs.mkdirSync(path.join(directory, "scenarios"));
        fs.writeFileSync(path.join(directory, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({envs:[{key:"mock",name:"Mock",baseUrl:"http://127.0.0.1:${port}"}],vars:{expectedStatus:"UP",token:"config-token"},variables:[{name:"token",env:"SCENARIO_TEST_TOKEN"}],scenarios:[{id:"health",name:"Health",url:"scenarios/health.js"}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/health.js"), `ScenarioTest.registerScenario("health",ScenarioTest.defineScenario({name:"Health",vars:{expectedStatus:"DOWN",token:"scenario-token"},steps:[{name:"healthy",path:"health",status:200,request:{headers:{"X-Token":"{{vars.token}}"}},assertions:[{path:"status",equals:"{{vars.expectedStatus}}"},{path:"token",equals:"cli-token"}]}]}));`, "utf8");
        const cli = path.resolve(import.meta.dirname, "../dist/scenario-test-cli.cjs");
        const result = await new Promise((resolve) => {
            const child = spawn(process.execPath, [cli, "--config", path.join(directory, "scenario.config.js"), "--all"], { env: { ...process.env, SCENARIO_TEST_TOKEN: "cli-token" }, stdio: ["ignore", "pipe", "pipe"] });
            let stdout = "";
            let stderr = "";
            child.stdout.on("data", (chunk) => { stdout += chunk; });
            child.stderr.on("data", (chunk) => { stderr += chunk; });
            child.on("close", (code) => resolve({ code, stdout, stderr }));
        });
        assert.equal(result.code, 0, result.stderr);
        assert.match(result.stdout, /\[PASS\] healthy/);
        assert.match(result.stdout, /Overall: 1\/1 passed/);
    } finally {
        server.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("CLI run 失败输出单列 each 元素级明细行（嵌套递归）", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-cli-each-"));
    const server = http.createServer((request, response) => {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ list: [{ items: [{ qty: 1 }, { qty: 9 }] }, { items: [{ qty: 2 }] }], note: "a\nb" }));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        const port = server.address().port;
        fs.mkdirSync(path.join(directory, "scenarios"));
        fs.writeFileSync(path.join(directory, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({envs:[{key:"mock",name:"Mock",baseUrl:"http://127.0.0.1:${port}"}],scenarios:[{id:"eachfail",name:"EachFail",url:"scenarios/eachfail.js"},{id:"notefail",name:"NoteFail",url:"scenarios/notefail.js"},{id:"passall",name:"PassAll",url:"scenarios/passall.js"}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/eachfail.js"), `ScenarioTest.registerScenario("eachfail",ScenarioTest.defineScenario({name:"EachFail",steps:[{name:"批量校验",path:"batch",assertions:[{path:"list",each:{path:"items",each:{path:"qty",lte:5}}}]}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/notefail.js"), `ScenarioTest.registerScenario("notefail",ScenarioTest.defineScenario({name:"NoteFail",steps:[{name:"单值校验",path:"batch",assertions:[{path:"note",equals:"ok"}]}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/passall.js"), `ScenarioTest.registerScenario("passall",ScenarioTest.defineScenario({name:"PassAll",steps:[{name:"通过项",path:"batch",assertions:[{path:"list",each:{path:"items",each:{path:"qty",lte:10}}}]}]}));`, "utf8");
        const cli = path.resolve(import.meta.dirname, "../src/cli.js");
        const result = await new Promise((resolve) => {
            const child = spawn(process.execPath, [cli, "--config", path.join(directory, "scenario.config.js"), "--all"], { stdio: ["ignore", "pipe", "pipe"] });
            let stdout = "";
            let stderr = "";
            child.stdout.setEncoding("utf8");
            child.stderr.setEncoding("utf8");
            child.stdout.on("data", (chunk) => { stdout += chunk; });
            child.stderr.on("data", (chunk) => { stderr += chunk; });
            child.on("close", (code) => resolve({ code, stdout, stderr }));
        });
        assert.notEqual(result.code, 0, "存在失败场景，退出码应非 0");
        assert.match(result.stdout, /\[FAIL\] 批量校验/);
        assert.match(result.stdout, /\[FAIL\] 单值校验/);
        assert.match(result.stdout, /\[PASS\] 通过项/);
        // 一层明细：失败元素序号 1 基 + 子断言名（each 定义无 name 时回落 path「items」）
        assert.match(result.stdout, /↳ 第 1 项 items: expected=/);
        // 嵌套层：外层第 1 项的内层第 2 项（qty 9 违反 lte 5），路径「 › 」串联
        assert.match(result.stdout, /↳ 第 1 项 › 第 2 项 qty: expected=5 actual=9/);
        // 极性判别：仅失败 each 产生明细行（一层 + 嵌套共 2 行），通过 each 与非 each 失败均不产生
        assert.equal(result.stdout.split("↳").length - 1, 2);
        // 非 each 失败的值含换行时经 JSON.stringify 透出为字面量 \n，不拆行
        assert.match(result.stdout, /- note: expected="ok" actual="a\\nb"/);
    } finally {
        server.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("CLI run includes 对象实际值失败输出语义化原因（数组/字符串分支不输出）", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-cli-includes-"));
    const server = http.createServer((request, response) => {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ obj: { a: 1 }, list: [{ a: 1 }], text: "abc" }));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        const port = server.address().port;
        fs.mkdirSync(path.join(directory, "scenarios"));
        fs.writeFileSync(path.join(directory, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({envs:[{key:"mock",name:"Mock",baseUrl:"http://127.0.0.1:${port}"}],scenarios:[{id:"includesobj",name:"IncludesObj",url:"scenarios/includesobj.js"}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/includesobj.js"), `ScenarioTest.registerScenario("includesobj",ScenarioTest.defineScenario({name:"IncludesObj",steps:[{name:"包含校验",path:"data",assertions:[{name:"对象包含",path:"obj",includes:{a:1}},{name:"数组包含",path:"list",includes:{a:1}},{name:"字符串包含",path:"text",includes:"a"}]}]}));`, "utf8");
        const cli = path.resolve(import.meta.dirname, "../src/cli.js");
        const result = await new Promise((resolve) => {
            const child = spawn(process.execPath, [cli, "--config", path.join(directory, "scenario.config.js"), "--all"], { stdio: ["ignore", "pipe", "pipe"] });
            let stdout = "";
            let stderr = "";
            child.stdout.setEncoding("utf8");
            child.stderr.setEncoding("utf8");
            child.stdout.on("data", (chunk) => { stdout += chunk; });
            child.stderr.on("data", (chunk) => { stderr += chunk; });
            child.on("close", (code) => resolve({ code, stdout, stderr }));
        });
        assert.notEqual(result.code, 0, "对象实际值 includes 仍应判失败，退出码非 0");
        // actual 保留原始对象（不再显示字符串化的 [object Object]），并紧随语义化原因行
        assert.match(result.stdout, /- 对象包含: expected=\{"a":1\} actual=\{"a":1\}/);
        assert.match(result.stdout, /原因: .*includes 不支持对象类型的实际值.*equals.*path/);
        // 极性判别：数组/字符串分支通过且不输出原因行
        assert.equal(result.stdout.split("原因: ").length - 1, 1, "仅对象实际值失败输出原因行");
    } finally {
        server.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("CLI run 失败长值输出结构化 diff 分块（多行拆行/差异定位/短值保持单行）", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-cli-diff-"));
    // 长 JSON 响应体（bodyText 断言序列化超 80 字符触发分块）+ 短 JSON（保持单行格式）
    const longBody = JSON.stringify({ code: "OK", message: "处理成功", payload: { items: [1, 2, 3], traceId: "trace-0001" } });
    const server = http.createServer((request, response) => {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(request.url === "/long" ? longBody : JSON.stringify({ status: "UP" }));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        const port = server.address().port;
        fs.mkdirSync(path.join(directory, "scenarios"));
        fs.writeFileSync(path.join(directory, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({envs:[{key:"mock",name:"Mock",baseUrl:"http://127.0.0.1:${port}"}],scenarios:[{id:"longdiff",name:"LongDiff",url:"scenarios/longdiff.js"},{id:"shortdiff",name:"ShortDiff",url:"scenarios/shortdiff.js"}]}));`, "utf8");
        // bodyText 与整 body 期望值差异足够大：长值分块 + 字符串首个差异定位
        fs.writeFileSync(path.join(directory, "scenarios/longdiff.js"), `ScenarioTest.registerScenario("longdiff",ScenarioTest.defineScenario({name:"LongDiff",steps:[{name:"长响应体",path:"long",assertions:[{name:"响应原文比对",from:"bodyText",equals:"${"x".repeat(100)}"}]}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/shortdiff.js"), `ScenarioTest.registerScenario("shortdiff",ScenarioTest.defineScenario({name:"ShortDiff",steps:[{name:"短响应体",path:"short",assertions:[{path:"status",equals:"DOWN"}]}]}));`, "utf8");
        const cli = path.resolve(import.meta.dirname, "../src/cli.js");
        const result = await new Promise((resolve) => {
            const child = spawn(process.execPath, [cli, "--config", path.join(directory, "scenario.config.js"), "--all"], { stdio: ["ignore", "pipe", "pipe"] });
            let stdout = "";
            let stderr = "";
            child.stdout.setEncoding("utf8");
            child.stderr.setEncoding("utf8");
            child.stdout.on("data", (chunk) => { stdout += chunk; });
            child.stderr.on("data", (chunk) => { stderr += chunk; });
            child.on("close", (code) => resolve({ code, stdout, stderr }));
        });
        assert.notEqual(result.code, 0, "存在失败场景，退出码应非 0");
        // 长值断言：单行头（值经 JSON.stringify 截断展示）后跟结构化分块
        assert.match(result.stdout, /\[FAIL\] 长响应体/);
        assert.match(result.stdout, /- 响应原文比对: expected=/);
        assert.match(result.stdout, /期望值（expected）:/);
        assert.match(result.stdout, /实际值（actual）:/);
        // 多行响应体按真实换行拆行，行号 1 基 + | 前缀
        assert.match(result.stdout, /\| 1 \| /);
        // 字符串首个差异定位：两串首字符即异（期望 x 开头、实际 { 开头）
        assert.match(result.stdout, /首个差异在第 1 个字符/);
        // 短值断言：不产生任何分块行（保持既有单行格式）
        assert.match(result.stdout, /\[FAIL\] 短响应体/);
        assert.match(result.stdout, /- status: expected="DOWN" actual="UP"/);
        // 极性守卫：分块标题只出现一次（长值断言），短值断言不产生分块
        assert.equal(result.stdout.split("期望值（expected）:").length - 1, 1, "分块标题只应来自长值断言一处");
    } finally {
        server.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("CLI run 失败步骤输出截断响应体原文（saveResponseAs 提示保存路径，通过步骤不输出）", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-cli-body-"));
    const longBody = "x".repeat(3000);
    const server = http.createServer((request, response) => {
        if (request.url === "/ok") {
            // 通过步骤的响应体含敏感字样：若被打印会抬高「响应体」出现计数，充当极性判别
            response.writeHead(200, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ status: "UP", note: "通过步骤响应体不该出现在输出" }));
            return;
        }
        if (request.url === "/long") {
            response.writeHead(500, { "Content-Type": "text/plain" });
            response.end(longBody);
            return;
        }
        response.writeHead(500, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ code: "BIZ_001", message: "库存不足" }));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        const port = server.address().port;
        fs.mkdirSync(path.join(directory, "scenarios"));
        fs.writeFileSync(path.join(directory, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({envs:[{key:"mock",name:"Mock",baseUrl:"http://127.0.0.1:${port}"}],scenarios:[{id:"errstep",name:"ErrStep",url:"scenarios/errstep.js"},{id:"longstep",name:"LongStep",url:"scenarios/longstep.js"},{id:"savestep",name:"SaveStep",url:"scenarios/savestep.js"},{id:"passstep",name:"PassStep",url:"scenarios/passstep.js"}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/errstep.js"), `ScenarioTest.registerScenario("errstep",ScenarioTest.defineScenario({name:"ErrStep",steps:[{name:"失败步骤",path:"err",status:200}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/longstep.js"), `ScenarioTest.registerScenario("longstep",ScenarioTest.defineScenario({name:"LongStep",steps:[{name:"超长响应",path:"long",status:200}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/savestep.js"), `ScenarioTest.registerScenario("savestep",ScenarioTest.defineScenario({name:"SaveStep",steps:[{name:"落盘步骤",path:"err",status:200,saveResponseAs:"responses/err.bin"}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/passstep.js"), `ScenarioTest.registerScenario("passstep",ScenarioTest.defineScenario({name:"PassStep",steps:[{name:"通过步骤",path:"ok",status:200}]}));`, "utf8");
        const cli = path.resolve(import.meta.dirname, "../src/cli.js");
        const result = await new Promise((resolve) => {
            const child = spawn(process.execPath, [cli, "--config", path.join(directory, "scenario.config.js"), "--all"], { stdio: ["ignore", "pipe", "pipe"] });
            let stdout = "";
            child.stdout.setEncoding("utf8");
            child.stdout.on("data", (chunk) => { stdout += chunk; });
            child.on("close", (code) => resolve({ code, stdout }));
        });
        assert.notEqual(result.code, 0, "存在失败场景，退出码应非 0");
        // 失败步骤：响应体原文透出服务端错误 payload（断言层只有 status 500，看不到业务错误码）
        assert.match(result.stdout, /\[FAIL\] 失败步骤/);
        assert.match(result.stdout, /响应体:/);
        assert.match(result.stdout, /库存不足/);
        // 超长响应体：截断标注 + 不输出完整 3000 字符
        assert.match(result.stdout, /\[FAIL\] 超长响应/);
        assert.match(result.stdout, /共 3000 字符，截断显示前 2000/);
        assert.ok(!result.stdout.includes(longBody), "超长响应体不应完整输出");
        // saveResponseAs：bodyText 为空时提示保存路径而非静默
        assert.match(result.stdout, /\[FAIL\] 落盘步骤/);
        assert.match(result.stdout, /响应体已保存至 .*err\.bin/);
        // 极性守卫：通过步骤不输出响应体——「响应体」标签共出现 3 次（errstep/longstep/savestep）
        assert.equal(result.stdout.split("响应体").length - 1, 3, "只有失败步骤才应输出响应体相关行");
    } finally {
        server.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("CLI run 重试轮询输出 [RETRY] 进度行（防长时间静默）", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-cli-retry-"));
    let calls = 0;
    const server = http.createServer((request, response) => {
        calls += 1;
        // 前 2 次未就绪、第 3 次就绪：retryUntil 在第 3 次尝试通过
        const ready = calls >= 3;
        response.writeHead(ready ? 200 : 202, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ ready }));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        const port = server.address().port;
        fs.mkdirSync(path.join(directory, "scenarios"));
        fs.writeFileSync(path.join(directory, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({envs:[{key:"mock",name:"Mock",baseUrl:"http://127.0.0.1:${port}"}],scenarios:[{id:"poll",name:"Poll",url:"scenarios/poll.js"}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/poll.js"), `ScenarioTest.registerScenario("poll",ScenarioTest.defineScenario({name:"Poll",steps:[{name:"轮询任务",path:"job",retryUntil:{maxAttempts:5,intervalMs:120},assertions:[{name:"就绪",path:"ready",equals:true}]}]}));`, "utf8");
        const cli = path.resolve(import.meta.dirname, "../src/cli.js");
        const result = await new Promise((resolve) => {
            const child = spawn(process.execPath, [cli, "--config", path.join(directory, "scenario.config.js"), "--all"], { stdio: ["ignore", "pipe", "pipe"] });
            let stdout = "";
            child.stdout.setEncoding("utf8");
            child.stdout.on("data", (chunk) => { stdout += chunk; });
            child.on("close", (code) => resolve({ code, stdout }));
        });
        assert.equal(result.code, 0, result.stdout);
        // 前 2 次未通过各一行进度；第 3 次通过不再输出
        assert.match(result.stdout, /\[RETRY\] 轮询任务 第 1\/5 次未通过（status 202，就绪），.*后重试/);
        assert.match(result.stdout, /\[RETRY\] 轮询任务 第 2\/5 次未通过（status 202，就绪），.*后重试/);
        assert.equal(result.stdout.split("[RETRY]").length - 1, 2, "只有未通过且将重试的尝试才输出进度行");
        assert.match(result.stdout, /\[PASS\] 轮询任务/);
    } finally {
        server.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("CLI run 响应体/路径/断言输出防 CI 命令与 ANSI 注入，SCENARIO_NO_BODY_PRINT 关闭输出", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-cli-esc-"));
    const server = http.createServer((request, response) => {
        if (request.url === "/forge") {
            // 服务端伪造 {"savedTo": ...} 试图命中「已保存至」分支吞掉真实 bodyText——
            // bodyText 非空时不得走保存提示，伪造内容同样过控制字符转义
            response.writeHead(500, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ savedTo: "fake\u001b[31mpath\u001b[0m", error: "boom" }));
            return;
        }
        if (request.url === "/p") {
            // 第一步提取字段供第二步拼进 path——resolve 后的 result.path 是服务端可控
            // 输出面：\n 可伪造新的 ::error:: 命令行，必须折成字面量
            response.writeHead(200, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ p: "safe\n::error::from server" }));
            return;
        }
        response.writeHead(500, { "Content-Type": "text/plain" });
        // 服务端可控内容混入 ESC 序列与裸 \r：转义后以字面量透出而非终端执行；
        // 并混入 GitHub Actions(::xxx:: 行首识别 + ##[ 旧格式) 、Azure DevOps(##vso[)、
        // TeamCity(##teamcity[) 工作流命令——## 系标记按整行 IndexOf 识别，引号挡不住，
        // 必须把标记字节序打散（[ 转写为 unicode 转义形态）
        response.end("ok\u001b[31mred\u001b[0m\nline\rtwo\n::error file=app.js::forged annotation\nmid ##vso[task.logissue type=error]forged suffix\n##[error]legacy forge\n##teamcity[testFailed name='x']");
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        const port = server.address().port;
        fs.mkdirSync(path.join(directory, "scenarios"));
        fs.writeFileSync(path.join(directory, "scenario.config.js"), `ScenarioTest.registerAdapter("biz",{execute:async()=>({status:500,headers:{},body:{savedTo:"fake",size:1,importantError:"lost"},bodyText:null})});ScenarioTest.registerAdapter("biz2",{execute:async()=>({status:"S\\n::error::remote status",headers:{},body:{ok:false},bodyText:null})});ScenarioTest.registerConfig(ScenarioTest.defineConfig({envs:[{key:"mock",name:"Mock",baseUrl:"http://127.0.0.1:${port}"}],scenarios:[{id:"esc",name:"Esc",url:"scenarios/esc.js"},{id:"inject",name:"Inject",url:"scenarios/inject.js"},{id:"bizstep",name:"BizStep",url:"scenarios/bizstep.js"},{id:"retrystep",name:"RetryStep",url:"scenarios/retrystep.js"}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/esc.js"), `ScenarioTest.registerScenario("esc",ScenarioTest.defineScenario({name:"Esc",failurePolicy:"continue",steps:[{name:"失败步骤",path:"x",status:200},{name:"伪造保存提示",path:"forge",status:200}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/inject.js"), `ScenarioTest.registerScenario("inject",ScenarioTest.defineScenario({name:"Inject",failurePolicy:"continue",steps:[{name:"提取字段",path:"p",status:200,extract:[{name:"p",path:"p"}]},{name:"路径注入",path:"{{vars.p}}",status:200}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/bizstep.js"), `ScenarioTest.registerScenario("bizstep",ScenarioTest.defineScenario({name:"BizStep",steps:[{name:"适配器业务响应",path:"x",adapter:"biz"}]}));`, "utf8");
        // 适配器返回的 status 字符串/断言名同为服务端可控输出面：[FAIL] 行 status、
        // [RETRY] detail（status + failedAssertion）、断言名逐行折行防注入
        fs.writeFileSync(path.join(directory, "scenarios/retrystep.js"), `ScenarioTest.registerScenario("retrystep",ScenarioTest.defineScenario({name:"RetryStep",steps:[{name:"重试注入",adapter:"biz2",retryUntil:{maxAttempts:2,intervalMs:100},assertions:[{name:"断言\\n::error::name",path:"ok",equals:true}]}]}));`, "utf8");
        const cli = path.resolve(import.meta.dirname, "../src/cli.js");
        const run = (env) => new Promise((resolve) => {
            // 隔离宿主 SCENARIO_* 环境变量（SCENARIO_AUTH/GLOBALS/NO_BODY_PRINT 会改变子进程行为）
            const childEnv = { ...process.env };
            for (const key of Object.keys(childEnv)) if (key.toUpperCase().startsWith("SCENARIO_")) delete childEnv[key];
            const child = spawn(process.execPath, [cli, "--config", path.join(directory, "scenario.config.js"), "--all"], { env: { ...childEnv, ...env }, stdio: ["ignore", "pipe", "pipe"] });
            let stdout = "";
            child.stdout.setEncoding("utf8");
            child.stdout.on("data", (chunk) => { stdout += chunk; });
            child.on("close", (code) => resolve({ code, stdout }));
        });
        const result = await run({});
        assert.notEqual(result.code, 0);
        // ESC 被 JSON 转义为字面 \u001b，stdout 不含裸 ESC 字节；行内 \r 同样转义
        assert.ok(!result.stdout.includes("\u001b"), "stdout 不应含裸 ESC 控制字符");
        assert.match(result.stdout, /\\u001b\[31mred\\u001b\[0m/);
        assert.match(result.stdout, /line\\rtwo/);
        // 伪造 savedTo 的 JSON 响应：输出 bodyText 原文（转义后）而非「已保存至」提示
        assert.match(result.stdout, /\[FAIL\] 伪造保存提示/);
        assert.ok(!result.stdout.includes("响应体已保存至"), "bodyText 非空时不得被伪造 savedTo 吞掉原文");
        assert.match(result.stdout, /fake\\u001b\[31mpath\\u001b\[0m/);
        // CI 工作流命令行：:: 行首识别经 JSON 引号破坏；## 系标记按整行 IndexOf 识别，
        // 标记 [ 被打散为 unicode 转义形态——stdout 任何位置都不得再出现可识别标记
        assert.ok(!/##vso\[|##teamcity\[|##\[|^\s*::/im.test(result.stdout), "stdout 不应含可识别的 CI 工作流命令标记");
        assert.match(result.stdout, /"::error file=app\.js::forged annotation"/);
        assert.match(result.stdout, /##vso\\u005btask\.logissue type=error\]forged suffix/);
        assert.match(result.stdout, /##\\u005berror\]legacy forge/);
        assert.match(result.stdout, /##teamcity\\u005btestFailed name='x'\]/);
        // result.path 注入：提取值含 \n + ::error::——[FAIL] 行折行后不得产生新命令行
        assert.match(result.stdout, /\[FAIL\] 路径注入 GET safe\\n::error::from server -> 500/);
        // 适配器业务 body 恰好含 savedTo+size：凭 SAVED_RESPONSE 标记区分，不吞原文
        assert.match(result.stdout, /\[FAIL\] 适配器业务响应/);
        assert.match(result.stdout, /importantError/, "适配器业务错误内容必须输出而非被伪造保存提示吞掉");
        assert.ok(!result.stdout.includes("响应体已保存至"), "非真实保存的 body 不得输出保存提示");
        // 适配器 status 字符串注入：[FAIL] 行与 [RETRY] detail 中 \n 折为字面量，
        // 不产生新命令行；断言名中的注入同样折行
        assert.match(result.stdout, /-> S\\n::error::remote status \(/);
        assert.match(result.stdout, /\[RETRY\] 重试注入 第 1\/2 次未通过（status S\\n::error::remote status，断言\\n::error::name）/);
        assert.match(result.stdout, /- 断言\\n::error::name: /);
        // SCENARIO_NO_BODY_PRINT 关闭响应体输出
        const hidden = await run({ SCENARIO_NO_BODY_PRINT: "1" });
        assert.notEqual(hidden.code, 0);
        assert.match(hidden.stdout, /\[FAIL\] 失败步骤/);
        assert.ok(!hidden.stdout.includes("响应体"), "关闭后不应输出响应体分块");
    } finally {
        server.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("CLI 拒绝旧 window 全局配置与场景格式", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-legacy-"));
    const cli = path.resolve(import.meta.dirname, "../dist/scenario-test-cli.cjs");
    try {
        fs.mkdirSync(path.join(directory, "scenarios"));
        fs.writeFileSync(path.join(directory, "scenario.config.js"), `window.GlobalConfig={envs:[{key:"mock",name:"Mock",baseUrl:"http://127.0.0.1"}],scenarios:[{id:"health",url:"scenarios/health.js"}]};`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/health.js"), `window.ScenarioData={name:"Health",steps:[]};`, "utf8");
        const result = await new Promise((resolve) => {
            const child = spawn(process.execPath, [cli, "--config", path.join(directory, "scenario.config.js"), "--all"], { stdio: ["ignore", "pipe", "pipe"] });
            let stderr = "";
            child.stderr.on("data", (chunk) => { stderr += chunk; });
            child.on("close", (code) => resolve({ code, stderr }));
        });
        assert.notEqual(result.code, 0);
        assert.match(result.stderr, /配置文件未注册配置/);
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("CLI 拒绝未知参数、缺失参数值和冲突选择", () => {
    const cli = path.resolve(import.meta.dirname, "../src/cli.js");
    for (const args of [
        ["--unknown"],
        ["--config", "--all"],
        ["--all", "--scenario", "health"],
        ["serve", "--port", "70000"],
        ["--config", "scenario.config.js", "doctor"]
    ]) {
        const result = spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });
        assert.notEqual(result.status, 0, `参数应失败: ${args.join(" ")}`);
    }
});

test("CLI 命令放错位置时给出纠正，而非静默当 run 场景名", () => {
    const cli = path.resolve(import.meta.dirname, "../src/cli.js");
    const result = spawnSync(process.execPath, [cli, "--config", "scenario.config.js", "doctor"], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /doctor 必须放在第一个参数位置/);
    assert.match(result.stderr, /doctor --config scenario\.config\.js/);
    // 命令在第一个位置时正常解析：doctor 对缺失配置仍会汇总 FAIL（退出码 1），
    // 但不应再报"命令必须放在第一个参数位置"，且 --json 输出可解析
    const ok = spawnSync(process.execPath, [cli, "doctor", "--config", "scenario.config.js", "--json"], { encoding: "utf8" });
    assert.doesNotMatch(ok.stdout + ok.stderr, /必须放在第一个参数位置/);
    assert.doesNotThrow(() => JSON.parse(ok.stdout));
});

test("CLI Overall 统计按计划步骤数计算", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-stats-"));
    const server = http.createServer((request, response) => {
        response.writeHead(500, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ error: "server error" }));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        const port = server.address().port;
        fs.mkdirSync(path.join(directory, "scenarios"));
        fs.writeFileSync(path.join(directory, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({envs:[{key:"mock",name:"Mock",baseUrl:"http://127.0.0.1:${port}"}],scenarios:[{id:"health",name:"Health",url:"scenarios/health.js"}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/health.js"), `ScenarioTest.registerScenario("health",ScenarioTest.defineScenario({name:"Health",steps:[{name:"step1",path:"a"},{name:"step2",path:"b"}]}));`, "utf8");
        const cli = path.resolve(import.meta.dirname, "../dist/scenario-test-cli.cjs");
        const result = await new Promise((resolve) => {
            const child = spawn(process.execPath, [cli, "--config", path.join(directory, "scenario.config.js"), "--all"], { stdio: ["ignore", "pipe", "pipe"] });
            let stdout = "";
            let stderr = "";
            child.stdout.on("data", (chunk) => { stdout += chunk; });
            child.stderr.on("data", (chunk) => { stderr += chunk; });
            child.on("close", (code) => resolve({ code, stdout, stderr }));
        });
        assert.equal(result.code, 1, result.stderr);
        assert.match(result.stdout, /Overall: 0\/2 passed/);
    } finally {
        server.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("CLI SCENARIO_GLOBALS 环境变量注入全局参数", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-globals-"));
    const server = http.createServer((request, response) => {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({
            url: request.url,
            header: request.headers["x-trace"],
            cookie: request.headers.cookie
        }));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        const port = server.address().port;
        fs.mkdirSync(path.join(directory, "scenarios"));
        fs.writeFileSync(path.join(directory, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({envs:[{key:"mock",name:"Mock",baseUrl:"http://127.0.0.1:${port}"}],scenarios:[{id:"echo",name:"Echo",url:"scenarios/echo.js"}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/echo.js"), `ScenarioTest.registerScenario("echo",ScenarioTest.defineScenario({name:"Echo",steps:[{name:"echo",path:"api",status:200,assertions:[{path:"header",equals:"cli-trace"},{path:"cookie",includes:"sid=cli-123"},{path:"url",includes:"source=cli"}]}]}));`, "utf8");
        const cli = path.resolve(import.meta.dirname, "../dist/scenario-test-cli.cjs");
        const globals = JSON.stringify([
            { type: "header", name: "X-Trace", value: "cli-trace" },
            { type: "cookie", name: "sid", value: "cli-123" },
            { type: "query", name: "source", value: "cli" }
        ]);
        const result = await new Promise((resolve) => {
            const child = spawn(process.execPath, [cli, "--config", path.join(directory, "scenario.config.js"), "--all"], { env: { ...process.env, SCENARIO_GLOBALS: globals }, stdio: ["ignore", "pipe", "pipe"] });
            let stdout = "";
            let stderr = "";
            child.stdout.on("data", (chunk) => { stdout += chunk; });
            child.stderr.on("data", (chunk) => { stderr += chunk; });
            child.on("close", (code) => resolve({ code, stdout, stderr }));
        });
        assert.equal(result.code, 0, result.stderr);
        assert.match(result.stdout, /\[PASS\] echo/);
        assert.match(result.stdout, /Overall: 1\/1 passed/);
    } finally {
        server.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("CLI SCENARIO_GLOBALS 非法 JSON 时报错", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-badglobals-"));
    try {
        fs.writeFileSync(path.join(directory, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({envs:[{key:"mock",name:"Mock",baseUrl:"http://127.0.0.1"}],scenarios:[]}));`, "utf8");
        const cli = path.resolve(import.meta.dirname, "../src/cli.js");
        const result = spawnSync(process.execPath, [cli, "--config", path.join(directory, "scenario.config.js")], {
            encoding: "utf8",
            env: { ...process.env, SCENARIO_GLOBALS: "not-json" }
        });
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /SCENARIO_GLOBALS 必须是合法的 JSON 数组/);
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("CLI --all 排除 manual 场景，显式 --scenario 可执行，SKIP 输出与 fail-on-skip", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-manual-"));
    const server = http.createServer((request, response) => {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ status: "UP" }));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        const port = server.address().port;
        fs.mkdirSync(path.join(directory, "scenarios"));
        fs.writeFileSync(path.join(directory, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({envs:[{key:"mock",name:"Mock",baseUrl:"http://127.0.0.1:${port}"}],scenarios:[
            {id:"auto",name:"Auto",url:"scenarios/auto.js"},
            {id:"manual",name:"ManualOnly",url:"scenarios/manual.js",manual:true},
            {id:"skippable",name:"Skippable",url:"scenarios/skippable.js"}
        ]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/auto.js"), `ScenarioTest.registerScenario("auto",ScenarioTest.defineScenario({name:"Auto",steps:[{name:"auto-step",path:"health",status:200}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/manual.js"), `ScenarioTest.registerScenario("manual",ScenarioTest.defineScenario({name:"ManualOnly",steps:[{name:"manual-step",path:"health",status:200}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/skippable.js"), `ScenarioTest.registerScenario("skippable",ScenarioTest.defineScenario({name:"Skippable",steps:[{name:"skip-step",path:"health",status:200,when:{from:"vars",path:"missing",exists:true}}]}));`, "utf8");
        const cli = path.resolve(import.meta.dirname, "../dist/scenario-test-cli.cjs");

        const run = (extraArgs, env) => new Promise((resolve) => {
            const child = spawn(process.execPath, [cli, "--config", path.join(directory, "scenario.config.js"), ...extraArgs], { env: { ...process.env, ...(env || {}) }, stdio: ["ignore", "pipe", "pipe"] });
            let stdout = "";
            let stderr = "";
            child.stdout.on("data", (chunk) => { stdout += chunk; });
            child.stderr.on("data", (chunk) => { stderr += chunk; });
            child.on("close", (code) => resolve({ code, stdout, stderr }));
        });

        // --all：manual 被排除，SKIP 输出与摘要展示
        const allResult = await run(["--all"]);
        assert.equal(allResult.code, 0, allResult.stderr);
        assert.match(allResult.stdout, /\[PASS\] auto-step/);
        assert.match(allResult.stdout, /\[SKIP\] skip-step/);
        assert.doesNotMatch(allResult.stdout, /ManualOnly|manual-step/);
        assert.match(allResult.stdout, /Summary: passed=1 failed=0 skipped=0 executed=1\/1 planned \(状态 PASSED\)/);
        assert.match(allResult.stdout, /Summary: passed=0 failed=0 skipped=1 executed=0\/1 planned \(状态 SKIPPED\)/);
        assert.match(allResult.stdout, /Overall: 1\/2 passed/);

        // --all --fail-on-skip：任何 skip 导致退出码 1
        const failOnSkip = await run(["--all", "--fail-on-skip"]);
        assert.equal(failOnSkip.code, 1);
        assert.match(failOnSkip.stdout, /fail-on-skip 已开启，存在 1 个 SKIP 步骤/);

        // 显式 --scenario 可执行 manual 场景
        const manualResult = await run(["--scenario", "manual"]);
        assert.equal(manualResult.code, 0, manualResult.stderr);
        assert.match(manualResult.stdout, /\[PASS\] manual-step/);
        assert.match(manualResult.stdout, /Overall: 1\/1 passed/);
    } finally {
        server.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("CLI 配置全部为 manual 时 --all 报明确错误", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-allmanual-"));
    try {
        fs.writeFileSync(path.join(directory, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({envs:[{key:"mock",name:"Mock",baseUrl:"http://127.0.0.1"}],scenarios:[{id:"m1",name:"M1",url:"s1.js",manual:true}]}));`, "utf8");
        const cli = path.resolve(import.meta.dirname, "../src/cli.js");
        const result = spawnSync(process.execPath, [cli, "--config", path.join(directory, "scenario.config.js"), "--all"], { encoding: "utf8" });
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /全部标记为 manual:true/);
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

// ==================== CLI 黑盒主路径补充（src/cli.js 直跑，覆盖计入统计） ====================

const cliSrc = path.resolve(import.meta.dirname, "../src/cli.js");

function runCli(args, extraEnv = {}) {
    return new Promise((resolve) => {
        const child = spawn(process.execPath, [cliSrc, ...args], {
            env: { ...process.env, ...extraEnv },
            stdio: ["ignore", "pipe", "pipe"]
        });
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (chunk) => { stdout += chunk; });
        child.stderr.on("data", (chunk) => { stderr += chunk; });
        child.on("close", (code) => resolve({ code, stdout, stderr }));
    });
}

test("CLI --scenario 逗号分隔多选：执行配置顺序子集，未命中项即报错", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-multisel-"));
    const server = http.createServer((request, response) => {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ status: "UP" }));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        const port = server.address().port;
        fs.mkdirSync(path.join(directory, "scenarios"));
        fs.writeFileSync(path.join(directory, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({envs:[{key:"mock",name:"Mock",baseUrl:"http://127.0.0.1:${port}"}],scenarios:[
            {id:"alpha",name:"Alpha",url:"scenarios/alpha.js"},
            {id:"beta",name:"Beta",url:"scenarios/beta.js"},
            {id:"gamma",name:"Gamma",url:"scenarios/gamma.js"},
            {id:"duty",name:"Duty",url:"scenarios/duty.js",manual:true}
        ]}));`, "utf8");
        for (const id of ["alpha", "beta", "gamma", "duty"]) {
            fs.writeFileSync(path.join(directory, `scenarios/${id}.js`), `ScenarioTest.registerScenario("${id}",ScenarioTest.defineScenario({name:"${id}",steps:[{name:"${id}-step",path:"health",status:200}]}));`, "utf8");
        }
        const configPath = path.join(directory, "scenario.config.js");

        // 多选（含显式点名 manual）：只执行选中项，顺序按配置清单
        const multi = await runCli(["--config", configPath, "--scenario", "alpha,duty"]);
        assert.equal(multi.code, 0, multi.stderr);
        assert.match(multi.stdout, /\[PASS\] alpha-step/);
        assert.match(multi.stdout, /\[PASS\] duty-step/);
        assert.doesNotMatch(multi.stdout, /beta-step|gamma-step/);
        assert.match(multi.stdout, /Overall: 2\/2 passed/);

        // 部分未命中：strict 报错点名缺失项（防 CI 拼写错误静默少跑），命中项也不执行
        const missing = await runCli(["--config", configPath, "--scenario", "alpha,ghost"]);
        assert.notEqual(missing.code, 0);
        assert.match(missing.stderr, /未找到场景: ghost/);
        assert.match(missing.stderr, /可用场景/);
        assert.doesNotMatch(missing.stdout, /alpha-step/);

        // 场景 name 同样可作选择器；空白片段容忍（"Alpha, ,beta"）
        const byName = await runCli(["--config", configPath, "--scenario", "Alpha, ,beta"]);
        assert.equal(byName.code, 0, byName.stderr);
        assert.match(byName.stdout, /\[PASS\] alpha-step/);
        assert.match(byName.stdout, /\[PASS\] beta-step/);
        assert.doesNotMatch(byName.stdout, /gamma-step|duty-step/);
    } finally {
        server.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("CLI --help 列出全部子命令与关键选项", async () => {
    const result = await runCli(["--help"]);
    assert.equal(result.code, 0);
    for (const keyword of ["run", "serve", "init", "capabilities", "doctor", "--config", "--env", "--base-url", "--scenario", "--all", "--fail-on-skip", "--json"]) {
        assert.match(result.stdout, new RegExp(keyword.replace(/[-]/g, "\-")), `help 应包含 ${keyword}`);
    }
});

test("CLI --help 选项清单从 contract 投射：每个契约选项均出现，无孤儿选项行", async () => {
    const { contract } = await import("../src/index.js");
    const result = await runCli(["--help"]);
    assert.equal(result.code, 0);
    // 正向：contract.cli.options 的每个选项名与别名都必须出现在 help 中
    for (const [name, spec] of Object.entries(contract.cli.options)) {
        assert.match(result.stdout, new RegExp(`--${name.replace(/[-]/g, "\\-")}`), `help 应包含 --${name}`);
        for (const alias of spec.aliases || []) {
            assert.match(result.stdout, new RegExp(`--${alias.replace(/[-]/g, "\\-")}`), `help 应包含 --${alias}`);
        }
    }
    // value 型选项标注取值占位（number 解析的标 <number>，其余标 <value>）
    assert.match(result.stdout, /--port <number>/);
    assert.match(result.stdout, /--config <value>/);
    // 极性：非契约手写选项不得混入（防回退成手写名单第二份副本）
    assert.doesNotMatch(result.stdout, /--verbose/);
});

test("CLI 未知参数给拼写建议，无近似候选时只提示 --help", async () => {
    // 近距拼写错误：给出唯一候选建议
    const suggestion = await runCli(["--confg", "x"]);
    assert.equal(suggestion.code, 1);
    assert.match(suggestion.stderr, /未知参数: --confg/);
    assert.match(suggestion.stderr, /是否想使用 --config/);
    // --help 自身也在建议名单内（真实可用选项，不在 contract.cli.options）
    const helpSuggestion = await runCli(["--hel"]);
    assert.match(helpSuggestion.stderr, /是否想使用 --help/);
    // 远距无关输入：不给猜测建议，直接指引 --help
    const noSuggestion = await runCli(["--xyzzy"]);
    assert.equal(noSuggestion.code, 1);
    assert.doesNotMatch(noSuggestion.stderr, /是否想使用/);
    assert.match(noSuggestion.stderr, /--help/);
});

test("CLI capabilities 文本模式输出可读清单，--json 输出纯 JSON", async () => {
    const text = await runCli(["capabilities"]);
    assert.equal(text.code, 0);
    assert.match(text.stdout, /generatedVars/);
    assert.match(text.stdout, /idcard/);
    assert.match(text.stdout, /luhn/);

    const json = await runCli(["capabilities", "--json"]);
    assert.equal(json.code, 0);
    const parsed = JSON.parse(json.stdout);
    assert.equal(parsed.schema, "scenario-test-capabilities");
    assert.deepEqual(parsed.generatedVars.types, ["timestamp", "uuidHex", "md5", "signature", "idcard", "luhn", "phone", "uscc", "uuid", "enum"]);
    assert.deepEqual(parsed.when.sources, ["vars", "lastResponse", "status"]);
    assert.deepEqual(parsed.when.targets, ["status"]);
});

test("CLI run --env 指定未知环境时报错退出，不静默回退", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-cli-env-"));
    try {
        fs.writeFileSync(path.join(directory, "scenario.config.js"),
            `ScenarioTest.registerConfig(ScenarioTest.defineConfig({envs:[{key:"mock",name:"Mock",baseUrl:"http://127.0.0.1:1"}],scenarios:[{id:"health",name:"Health",url:"scenarios/health.js"}]}));`, "utf8");
        fs.mkdirSync(path.join(directory, "scenarios"), { recursive: true });
        fs.writeFileSync(path.join(directory, "scenarios/health.js"),
            `ScenarioTest.registerScenario("health",ScenarioTest.defineScenario({name:"Health",steps:[{name:"h",path:"health",status:200}]}));`, "utf8");
        const result = await runCli(["--config", path.join(directory, "scenario.config.js"), "--env", "nope", "--all"]);
        assert.notEqual(result.code, 0);
        assert.match(result.stderr + result.stdout, /nope/);
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("CLI run --base-url 临时覆盖环境地址且 SCENARIO_AUTH 注入 Authorization", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-cli-base-"));
    const hits = [];
    const serverA = http.createServer((_req, res) => { hits.push("A"); res.end("{}"); });
    const serverB = http.createServer((req, res) => {
        hits.push({ target: "B", auth: req.headers.authorization });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "UP" }));
    });
    await Promise.all([
        new Promise((resolve) => serverA.listen(0, "127.0.0.1", resolve)),
        new Promise((resolve) => serverB.listen(0, "127.0.0.1", resolve))
    ]);
    try {
        const portB = serverB.address().port;
        fs.mkdirSync(path.join(directory, "scenarios"), { recursive: true });
        fs.writeFileSync(path.join(directory, "scenario.config.js"),
            `ScenarioTest.registerConfig(ScenarioTest.defineConfig({envs:[{key:"mock",name:"Mock",baseUrl:"http://127.0.0.1:${serverA.address().port}"}],scenarios:[{id:"health",name:"Health",url:"scenarios/health.js"}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/health.js"),
            `ScenarioTest.registerScenario("health",ScenarioTest.defineScenario({name:"Health",steps:[{name:"h",path:"health",status:200}]}));`, "utf8");
        const result = await runCli(
            ["--config", path.join(directory, "scenario.config.js"), "--all", "--base-url", `http://127.0.0.1:${portB}`],
            { SCENARIO_AUTH: "Bearer cli-injected" }
        );
        assert.equal(result.code, 0, result.stderr);
        assert.deepEqual(hits, [{ target: "B", auth: "Bearer cli-injected" }], "应只命中覆盖后的 B 服务且带注入的 Authorization");
    } finally {
        serverA.close();
        serverB.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("CLI --scenario 未命中时列出可用场景候选，manual 场景带显式选择提示", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-cli-candidates-"));
    try {
        fs.writeFileSync(path.join(directory, "scenario.config.js"),
            `ScenarioTest.registerConfig(ScenarioTest.defineConfig({envs:[{key:"mock",name:"Mock",baseUrl:"http://127.0.0.1:1"}],scenarios:[
                {id:"health",name:"健康检查",url:"scenarios/health.js"},
                {id:"audit",name:"审计",url:"scenarios/audit.js",manual:true}
            ]}));`, "utf8");
        fs.mkdirSync(path.join(directory, "scenarios"), { recursive: true });
        fs.writeFileSync(path.join(directory, "scenarios/health.js"),
            `ScenarioTest.registerScenario("health",ScenarioTest.defineScenario({name:"健康检查",steps:[{name:"h",path:"health",status:200}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/audit.js"),
            `ScenarioTest.registerScenario("audit",ScenarioTest.defineScenario({name:"审计",steps:[{name:"a",path:"audit",status:200}]}));`, "utf8");
        const result = await runCli(["--config", path.join(directory, "scenario.config.js"), "--scenario", "nope"]);
        assert.equal(result.code, 1);
        assert.match(result.stderr, /未找到场景: nope/);
        // 候选清单：id + name 同列，manual 场景带（manual:true）标注
        assert.match(result.stderr, /可用场景（显示 2\/2 项）/);
        assert.match(result.stderr, /- health — 健康检查/);
        assert.match(result.stderr, /- audit — 审计（manual:true）/);
        assert.match(result.stderr, /manual:true 场景需通过 --scenario <id> 显式选择/);
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("CLI run 结束输出结论行：失败/全部跳过/完成三态口径可判别", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-cli-verdict-"));
    const server = http.createServer((request, response) => {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ status: "UP" }));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        const port = server.address().port;
        fs.mkdirSync(path.join(directory, "scenarios"));
        fs.writeFileSync(path.join(directory, "scenario.config.js"),
            `ScenarioTest.registerConfig(ScenarioTest.defineConfig({envs:[{key:"mock",name:"Mock",baseUrl:"http://127.0.0.1:${port}"}],scenarios:[
                {id:"failing",name:"Failing",url:"scenarios/failing.js"},
                {id:"allskip",name:"AllSkip",url:"scenarios/allskip.js"},
                {id:"passing",name:"Passing",url:"scenarios/passing.js"}
            ]}));`, "utf8");
        // 失败：断言必败；全部跳过：when 恒不满足；通过：隐式 2xx
        fs.writeFileSync(path.join(directory, "scenarios/failing.js"),
            `ScenarioTest.registerScenario("failing",ScenarioTest.defineScenario({name:"Failing",steps:[{name:"f",path:"api",status:200,assertions:[{path:"status",equals:"DOWN"}]}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/allskip.js"),
            `ScenarioTest.registerScenario("allskip",ScenarioTest.defineScenario({name:"AllSkip",steps:[{name:"s",path:"api",status:200,when:{from:"vars",path:"missing",exists:true}}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/passing.js"),
            `ScenarioTest.registerScenario("passing",ScenarioTest.defineScenario({name:"Passing",steps:[{name:"p",path:"api",status:200}]}));`, "utf8");

        const verdictOf = (result) => {
            const lines = result.stdout.split("\n").filter((line) => line.includes("结论："));
            assert.equal(lines.length, 1, `应恰好一行结论，实际: ${lines.join(" | ")}`);
            return lines[0];
        };

        // 失败态：实际失败 1 步，退出码 1
        const failed = await runCli(["--config", path.join(directory, "scenario.config.js"), "--scenario", "failing"]);
        assert.equal(failed.code, 1);
        assert.match(verdictOf(failed), /结论：执行失败。通过 0 步，实际失败 1 步/);
        assert.match(verdictOf(failed), /未执行步骤不计入通过/);

        // 全部跳过态：0 通过 1 跳过，默认退出码 0
        const skipped = await runCli(["--config", path.join(directory, "scenario.config.js"), "--scenario", "allskip"]);
        assert.equal(skipped.code, 0);
        assert.match(verdictOf(skipped), /结论：全部跳过，未发起请求。通过 0 步，实际失败 0 步，条件跳过 1 步/);
        assert.match(verdictOf(skipped), /按默认策略退出码为 0/);

        // 完成态：1 通过
        const passed = await runCli(["--config", path.join(directory, "scenario.config.js"), "--scenario", "passing"]);
        assert.equal(passed.code, 0);
        assert.match(verdictOf(passed), /结论：执行完成。通过 1 步，实际失败 0 步，条件跳过 0 步，因 stop 策略未执行 0 步/);
    } finally {
        server.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("CLI SCENARIO_AUTH 与 --authorization 冲突时环境变量优先并警告", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-cli-auth-conflict-"));
    const server = http.createServer((req, res) => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ auth: req.headers.authorization }));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        const port = server.address().port;
        fs.mkdirSync(path.join(directory, "scenarios"), { recursive: true });
        fs.writeFileSync(path.join(directory, "scenario.config.js"),
            `ScenarioTest.registerConfig(ScenarioTest.defineConfig({envs:[{key:"mock",name:"Mock",baseUrl:"http://127.0.0.1:${port}"}],scenarios:[{id:"test",name:"Test",url:"scenarios/test.js"}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/test.js"),
            `ScenarioTest.registerScenario("test",ScenarioTest.defineScenario({name:"Test",steps:[{name:"s",path:"api",assertions:[{path:"auth",equals:"Bearer env-token"}]}]}));`, "utf8");

        const result = await runCli(
            ["--config", path.join(directory, "scenario.config.js"), "--all", "--authorization", "Bearer cli-token"],
            { SCENARIO_AUTH: "Bearer env-token" }
        );

        assert.equal(result.code, 0, result.stderr);
        assert.match(result.stderr, /⚠️\s+警告: 同时检测到 SCENARIO_AUTH 环境变量和 --authorization 参数/);
        assert.match(result.stderr, /环境变量优先级更高，--authorization 参数将被忽略/);
        assert.match(result.stdout, /\[PASS\]/);
    } finally {
        server.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("CLI --authorization 单独使用时输出弃用警告", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-cli-auth-deprecated-"));
    const server = http.createServer((req, res) => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ auth: req.headers.authorization }));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        const port = server.address().port;
        fs.mkdirSync(path.join(directory, "scenarios"), { recursive: true });
        fs.writeFileSync(path.join(directory, "scenario.config.js"),
            `ScenarioTest.registerConfig(ScenarioTest.defineConfig({envs:[{key:"mock",name:"Mock",baseUrl:"http://127.0.0.1:${port}"}],scenarios:[{id:"test",name:"Test",url:"scenarios/test.js"}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/test.js"),
            `ScenarioTest.registerScenario("test",ScenarioTest.defineScenario({name:"Test",steps:[{name:"s",path:"api",assertions:[{path:"auth",equals:"Bearer deprecated-token"}]}]}));`, "utf8");

        const result = await runCli(
            ["--config", path.join(directory, "scenario.config.js"), "--all", "--authorization", "Bearer deprecated-token"],

        );

        assert.equal(result.code, 0, result.stderr);
        assert.match(result.stderr, /⚠️\s+弃用警告: --authorization 参数将在未来版本中移除/);
        assert.match(result.stderr, /推荐使用环境变量: export SCENARIO_AUTH/);
        assert.match(result.stderr, /原因: 命令行参数在进程列表中可见，存在安全风险/);
        assert.match(result.stdout, /\[PASS\]/);
    } finally {
        server.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("CLI SCENARIO_GLOBALS 项缺少必需字段时报错", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-cli-globals-invalid-"));
    try {
        fs.mkdirSync(path.join(directory, "scenarios"), { recursive: true });
        fs.writeFileSync(path.join(directory, "scenario.config.js"),
            `ScenarioTest.registerConfig(ScenarioTest.defineConfig({envs:[{key:"mock",name:"Mock",baseUrl:"http://127.0.0.1:1"}],scenarios:[{id:"test",name:"Test",url:"scenarios/test.js"}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/test.js"),
            `ScenarioTest.registerScenario("test",ScenarioTest.defineScenario({name:"Test",steps:[{name:"s",path:"api"}]}));`, "utf8");

        const cases = [
            { value: '[{"name":"X-Token","value":"abc"}]', error: /第 1 项无效.*type/ },
            { value: '[{"type":"header","value":"abc"}]', error: /第 1 项无效.*name/ },
            { value: '[{"type":"invalid","name":"X-Token","value":"abc"}]', error: /第 1 项无效.*type/ },
        ];

        for (const { value, error } of cases) {
            const result = await runCli(
                ["--config", path.join(directory, "scenario.config.js"), "--all"],
                { SCENARIO_GLOBALS: value }
            );
            assert.equal(result.code, 1, `应因 SCENARIO_GLOBALS 格式错误退出码 1: ${value}`);
            assert.match(result.stderr, error, `错误消息应匹配: ${value}`);
        }
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("CLI 失败输出有界：20k 原值不整行打印，顶层与嵌套 each 长值走占位+分块", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-cli-bound-"));
    const bigText = "a".repeat(20000);
    const server = http.createServer((request, response) => {
        response.writeHead(200, { "Content-Type": "application/json" });
        if (request.url === "/list") {
            response.end(JSON.stringify({ list: [{ text: bigText }], status: "UP" }));
            return;
        }
        response.end(JSON.stringify({ status: "UP" }));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        const port = server.address().port;
        fs.mkdirSync(path.join(directory, "scenarios"), { recursive: true });
        fs.writeFileSync(path.join(directory, "scenario.config.js"),
            `ScenarioTest.registerConfig(ScenarioTest.defineConfig({envs:[{key:"mock",name:"Mock",baseUrl:"http://127.0.0.1:${port}"}],scenarios:[
                {id:"bigfail",name:"BigFail",url:"scenarios/bigfail.js"},
                {id:"eachfail",name:"EachFail",url:"scenarios/eachfail.js"}
            ]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/bigfail.js"),
            `ScenarioTest.registerScenario("bigfail",ScenarioTest.defineScenario({name:"BigFail",steps:[{name:"大文本",path:"list",status:200,assertions:[{name:"正文",from:"bodyText",equals:"no"},{name:"短值对照",path:"status",equals:"DOWN"}]}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/eachfail.js"),
            `ScenarioTest.registerScenario("eachfail",ScenarioTest.defineScenario({name:"EachFail",steps:[{name:"批量",path:"list",status:200,assertions:[{name:"逐项",path:"list",each:{path:"text",equals:"no"}}]}]}));`, "utf8");
        const result = await runCli(["--config", path.join(directory, "scenario.config.js"), "--all"]);
        assert.equal(result.code, 1, result.stderr);
        assert.ok(!result.stdout.includes(bigText), "完整 20000 字符原值不得出现在 stdout");
        const valueLines = result.stdout.split("\n").filter((line) => line.includes("actual=") || line.includes("| "));
        assert.ok(valueLines.length >= 2, "应存在长值相关输出行");
        for (const line of valueLines) {
            assert.ok(line.length <= 280, `值相关行宽度应 ≤280（含缩进），实际 ${line.length}`);
        }
        assert.match(result.stdout, /- 正文: expected="no" actual=（长值，见下方）/);
        assert.match(result.stdout, /实际值（actual）:/);
        assert.match(result.stdout, /（本行已截断）/);
        assert.match(result.stdout, /↳ 第 1 项 text: expected="no" actual=（长值，见下方）/);
        assert.match(result.stdout, /- 短值对照: expected="DOWN" actual="UP"/);
    } finally {
        server.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("CLI --config 缺值拒绝 -h/--help 占位，单独 -h 正常输出帮助", () => {
    const missingH = spawnSync(process.execPath, [cliSrc, "run", "--config", "-h"], { encoding: "utf8" });
    assert.equal(missingH.status, 1);
    assert.match(missingH.stderr, /错误：--config 缺少参数值/);
    assert.match(missingH.stderr, /请为 --config 提供一个值/);
    assert.doesNotMatch(missingH.stderr, /配置文件不存在/);
    const missingHelp = spawnSync(process.execPath, [cliSrc, "run", "--config", "--help"], { encoding: "utf8" });
    assert.equal(missingHelp.status, 1);
    assert.match(missingHelp.stderr, /错误：--config 缺少参数值/);
    const dashH = spawnSync(process.execPath, [cliSrc, "-h"], { encoding: "utf8" });
    assert.equal(dashH.status, 0);
    assert.match(dashH.stdout, /Commands:/);
    const runH = spawnSync(process.execPath, [cliSrc, "run", "-h"], { encoding: "utf8" });
    assert.equal(runH.status, 0);
    assert.match(runH.stdout, /Commands:/);
});

test("CLI run --json：stdout 纯净可解析，单场景输出 report、多场景聚合，进度行改走 stderr", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-cli-json-"));
    const server = http.createServer((request, response) => {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ status: "UP" }));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        const port = server.address().port;
        fs.mkdirSync(path.join(directory, "scenarios"));
        fs.writeFileSync(path.join(directory, "scenario.config.js"), `ScenarioTest.registerConfig(ScenarioTest.defineConfig({envs:[{key:"mock",name:"Mock",baseUrl:"http://127.0.0.1:${port}"}],scenarios:[{id:"ok",name:"Ok",url:"scenarios/ok.js"},{id:"bad",name:"Bad",url:"scenarios/bad.js"}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/ok.js"), `ScenarioTest.registerScenario("ok",ScenarioTest.defineScenario({name:"Ok",steps:[{name:"healthy",path:"health",status:200,assertions:[{path:"status",equals:"UP"}]}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/bad.js"), `ScenarioTest.registerScenario("bad",ScenarioTest.defineScenario({name:"Bad",steps:[{name:"broken",path:"health",status:200,assertions:[{path:"status",equals:"DOWN"}]}]}));`, "utf8");
        const config = path.join(directory, "scenario.config.js");

        // 单场景成功：直接输出该场景 report（不包 scenarios），退出码 0
        const single = await runCli(["--config", config, "--scenario", "ok", "--json"]);
        assert.equal(single.code, 0, single.stderr);
        const singleReport = JSON.parse(single.stdout);
        assert.equal(singleReport.scenarioName, "Ok");
        assert.equal(singleReport.status, "PASSED");
        assert.equal(singleReport.planned, 1);
        assert.equal(singleReport.results[0].name, "healthy");
        assert.ok(Array.isArray(singleReport.results[0].assertions));
        assert.equal(Object.hasOwn(singleReport, "scenarios"), false);
        assert.match(single.stderr, /\[PASS\] healthy/);
        assert.doesNotMatch(single.stdout, /\[PASS\]|Overall:/);

        // 多场景（含失败）：顶层包 { scenarios: [...] }，失败时仍输出完整 JSON 且退出码非 0
        const multi = await runCli(["--config", config, "--all", "--json"]);
        assert.notEqual(multi.code, 0, "失败场景应返回非零退出码");
        const payload = JSON.parse(multi.stdout);
        assert.equal(Array.isArray(payload.scenarios), true);
        assert.equal(payload.scenarios.length, 2);
        assert.equal(payload.scenarios[0].status, "PASSED");
        assert.equal(payload.scenarios[1].status, "FAILED");
        assert.equal(payload.scenarios[1].failed, 1);
        assert.match(multi.stderr, /\[FAIL\] broken/);
        assert.match(multi.stderr, /Overall: 1\/2 passed/);
        assert.doesNotMatch(multi.stdout, /\[FAIL\]|\[PASS\]|Overall:|结论：/);
    } finally {
        server.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test("CLI run --json：上传超限保留结构化 uploadTooLarge 且退出码非零", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-test-cli-upload-"));
    let hits = 0;
    const server = http.createServer((_request, response) => {
        hits += 1;
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end("{}");
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        const port = server.address().port;
        const upload = Buffer.from("0123456789", "utf8");
        fs.mkdirSync(path.join(directory, "scenarios"));
        fs.writeFileSync(path.join(directory, "upload.bin"), upload);
        fs.writeFileSync(path.join(directory, "scenario.config.js"),
            `ScenarioTest.registerConfig(ScenarioTest.defineConfig({envs:[{key:"mock",name:"Mock",baseUrl:"http://127.0.0.1:${port}"}],maxUploadBytes:5,scenarios:[{id:"upload",name:"Upload",url:"scenarios/upload.js"}]}));`, "utf8");
        fs.writeFileSync(path.join(directory, "scenarios/upload.js"),
            `ScenarioTest.registerScenario("upload",ScenarioTest.defineScenario({name:"Upload",steps:[{name:"上传",method:"POST",path:"upload",request:{fileUpload:{filePath:"upload.bin",fieldName:"file"}}}]}));`, "utf8");
        const result = await runCli(["--config", path.join(directory, "scenario.config.js"), "--scenario", "upload", "--json"]);
        assert.notEqual(result.code, 0, "上传超限应使 CLI 退出码非 0");
        const report = JSON.parse(result.stdout);
        const step = report.results[0];
        assert.equal(report.status, "FAILED");
        assert.equal(step.passed, false);
        assert.equal(step.errorCode, "uploadTooLarge");
        assert.deepEqual(step.uploadTooLarge, { actualBytes: upload.byteLength, limitBytes: 5 });
        assert.match(step.error, /上传文件超过大小上限/);
        assert.match(result.stderr, /\[FAIL\] 上传/);
        assert.equal(hits, 0, "超限应在发起上传前被拒绝");
    } finally {
        server.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

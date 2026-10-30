import assert from "node:assert/strict";
import vm from "node:vm";
import test from "node:test";
import { createHarDraft, createCurlDraft, renderDraftFile } from "../src/import.js";

// Issue #117：U+2028/U+2029 在 JS 中是行终止符，safeText 只过滤 C0/C1 时
// 会从 // 注释逃逸；HAR 头名/URL 可由第三方服务端控制，导入后 run 即执行注入语句。
// 现行为：非法头名/方法的条目按无效请求过滤（ImportError 走 filteredInvalid），
// URL 中的行终止符由 URL 解析器百分号编码；生成物中绝不允许出现裸行终止符。

const LINE_SEPARATORS = /[\u2028\u2029]/;
const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);

function harEntry({ method = "GET", url, headers = [] }) {
    return { request: { method, url, headers }, response: { status: 200, content: { mimeType: "application/json" } } };
}

function harLog(entries) {
    return JSON.stringify({ log: { version: "1.2", entries } });
}

test("#117：HAR 头名含 U+2028/U+2029 的条目被过滤，注入片段不出现在草稿中", () => {
    for (const [separator, label] of [[LS, "U+2028"], [PS, "U+2029"]]) {
        const draft = createHarDraft(harLog([harEntry({
            url: "https://api.example.com/orders",
            headers: [{ name: `X-Token${separator}globalThis.__pwned=1;//`, value: "v" }]
        })]));
        assert.equal(draft.stats.filteredInvalid, 1, `头名含 ${label} 的请求应按无效过滤`);
        assert.equal(draft.stats.imported, 0);
        const source = renderDraftFile(draft, { id: "injected" });
        assert.doesNotThrow(() => new vm.Script(source), "生成的草稿必须是合法 JS");
        assert.doesNotMatch(source, /__pwned/, "注入片段不得出现在生成文件中");
    }
});

test("#117：非法 method 被过滤；含行终止符的 URL 只以百分号编码形式进入草稿", () => {
    const draft = createHarDraft(harLog([
        harEntry({ method: `GET${LS}globalThis.__pwned=1;//`, url: "https://api.example.com/x" }),
        harEntry({ url: `https://api.example.com/orders${LS}globalThis.__pwned=1;//` })
    ]));
    assert.equal(draft.stats.filteredInvalid, 1, "非法 method 的条目应被过滤");
    assert.equal(draft.stats.imported, 1, "URL 中的行终止符由 URL 解析器百分号编码，可安全导入");
    assert.doesNotMatch(draft.scenario.steps[0].path, LINE_SEPARATORS, "路径中不得残留行终止符");
    const source = renderDraftFile(draft, { id: "injected" });
    assert.doesNotThrow(() => new vm.Script(source), "生成的草稿必须是合法 JS");
    assert.doesNotMatch(source, LINE_SEPARATORS, "生成文件不得包含 U+2028/U+2029");
});

test("#117：curl 的 -X 与 -H 同样校验 token，生成文件不含裸行终止符", () => {
    assert.throws(
        () => createCurlDraft(`curl -X 'GET${LS}globalThis.__pwned=1;//' https://api.example.com/x`),
        /不是合法的 HTTP 方法/
    );
    assert.throws(
        () => createCurlDraft(`curl -H 'X-Token${LS}pwn: v' https://api.example.com/x`),
        /请求头名不合法/
    );
    const draft = createCurlDraft(`curl 'https://api.example.com/orders${PS}globalThis.__pwned=1;//'`);
    const source = renderDraftFile(draft, { id: "injected-curl" });
    assert.doesNotThrow(() => new vm.Script(source), "生成的草稿必须是合法 JS");
    assert.doesNotMatch(source, LINE_SEPARATORS, "生成文件不得包含 U+2028/U+2029 行终止符");
});

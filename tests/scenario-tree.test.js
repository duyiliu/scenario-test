import assert from "node:assert/strict";
import test from "node:test";
import workbenchView, { buildScenarioTree } from "../src/browser/ui/ui-view.js";

function scenario(name, file, tags = []) {
    return { name, file, tags };
}

test("场景树：按文件路径还原目录层级，公共前缀折叠为根节点", () => {
    const all = [
        scenario("", "scenario-test/scenarios/order/create.js"),
        scenario("", "scenario-test/scenarios/order/refund.js"),
        scenario("", "scenario-test/scenarios/user/login.js"),
        scenario("健康检查", "scenario-test/scenarios/health.js")
    ];
    const tree = buildScenarioTree(all, all, {});

    assert.equal(tree.root.name, "scenarios");
    assert.equal(tree.root.path, "scenario-test/scenarios");
    assert.equal(tree.root.count, 4);
    assert.deepEqual(tree.root.children.map((node) => node.type + ":" + node.name), [
        "dir:order",
        "dir:user",
        "file:健康检查"
    ]);
    assert.equal(tree.root.children[0].path, "scenario-test/scenarios/order");
    assert.equal(tree.root.children[0].count, 2);
    assert.deepEqual(tree.root.children[0].children.map((node) => node.file), [
        "scenario-test/scenarios/order/create.js",
        "scenario-test/scenarios/order/refund.js"
    ]);
    // 树内文件副标题只保留相对目录，文件名已在标题里，避免重复整条路径
    assert.equal(tree.root.children[0].children[0].dirPath, "order");
    assert.equal(tree.root.children[0].children[0].depth, 2);
});

test("场景树：Windows 分隔符与 ./ 前缀归一化", () => {
    const all = [
        scenario("", ".\\scenarios\\order\\create.js"),
        scenario("", "./scenarios/user/login.js")
    ];
    const tree = buildScenarioTree(all, all, {});

    assert.equal(tree.root.path, "scenarios");
    assert.deepEqual(tree.root.children.map((node) => node.name), ["order", "user"]);
    assert.equal(tree.root.children[0].children[0].relativePath, "order/create.js");
});

test("场景树：置顶项移出目录树，按置顶顺序单独成组", () => {
    const all = [
        scenario("A", "scenarios/a.js"),
        scenario("B", "scenarios/b.js"),
        scenario("C", "scenarios/c.js")
    ];
    const tree = buildScenarioTree(all, all, { "scenarios/c.js": 0, "scenarios/a.js": 1 });

    assert.deepEqual(tree.pinned.map((node) => node.file), ["scenarios/c.js", "scenarios/a.js"]);
    assert.deepEqual(tree.root.children.map((node) => node.file), ["scenarios/b.js"]);
    assert.equal(tree.root.count, 1);
    assert.equal(tree.pinned[0].relativePath, "c.js");
    assert.equal(tree.pinned[0].pinned, true);
});

test("场景树：置顶入参兼容有序数组", () => {
    const all = [
        scenario("A", "scenarios/a.js"),
        scenario("B", "scenarios/b.js")
    ];
    const tree = buildScenarioTree(all, all, ["scenarios/b.js"]);

    assert.deepEqual(tree.pinned.map((node) => node.file), ["scenarios/b.js"]);
    assert.deepEqual(tree.root.children.map((node) => node.file), ["scenarios/a.js"]);
});

test("场景树：搜索过滤只保留命中分支，根目录按完整清单计算", () => {
    const all = [
        scenario("下单", "scenario-test/scenarios/order/create.js"),
        scenario("登录", "scenario-test/scenarios/user/login.js")
    ];
    const visible = [all[1]];
    const tree = buildScenarioTree(all, visible, {});

    assert.equal(tree.root.path, "scenario-test/scenarios");
    assert.deepEqual(tree.root.children.map((node) => node.name), ["user"]);
    assert.equal(tree.root.count, 1);
});

test("场景树：无公共目录时以顶层目录为根，不额外造根节点", () => {
    const all = [
        scenario("", "a/x.js"),
        scenario("", "b/y.js")
    ];
    const tree = buildScenarioTree(all, all, {});

    assert.equal(tree.root, null);
    assert.deepEqual(tree.nodes.map((node) => node.name), ["a", "b"]);
    assert.equal(tree.nodes[0].depth, 0);
});

test("场景树：name 与完整路径相同时用文件名作节点标题", () => {
    const all = [scenario("scenarios/health.js", "scenarios/health.js")];
    const tree = buildScenarioTree(all, all, {});
    const node = tree.root.children[0];

    assert.equal(node.name, "health.js");
    assert.equal(node.file, "scenarios/health.js");
    assert.equal(node.dirPath, "");
});

test("场景树：全部置顶时目录树为空，仅保留置顶组", () => {
    const all = [scenario("A", "scenarios/a.js")];
    const tree = buildScenarioTree(all, all, { "scenarios/a.js": 0 });

    assert.equal(tree.root, null);
    assert.deepEqual(tree.nodes, []);
    assert.deepEqual(tree.pinned.map((node) => node.file), ["scenarios/a.js"]);
});

test("场景树：空清单返回空树", () => {
    const tree = buildScenarioTree([], [], {});

    assert.equal(tree.root, null);
    assert.deepEqual(tree.nodes, []);
    assert.deepEqual(tree.pinned, []);
});

test("工作台场景列表：渲染目录树，折叠状态在重绘后保留", () => {
    const list = { innerHTML: "" };
    const clearButton = { hidden: false };
    globalThis.document = {
        getElementById(id) {
            if (id === "scenarioList") return list;
            if (id === "scenarioSearchClearBtn") return clearButton;
            return null;
        }
    };
    const all = [
        scenario("下单", "scenarios/order/create.js"),
        scenario("退款", "scenarios/order/refund.js"),
        scenario("登录", "scenarios/user/login.js")
    ];
    try {
        workbenchView.renderScenarioSelect(all, "scenarios/order/create.js", "", {}, "");
        assert.match(list.innerHTML, /scenario-tree-dir__toggle/);
        assert.match(list.innerHTML, /data-scenario-dir-toggle="dir:scenarios\/order"/);
        assert.match(list.innerHTML, /data-scenario-file="scenarios\/order\/create.js"/);
        assert.match(list.innerHTML, /scenario-tree-item[^"]*is-active/);
        assert.equal(clearButton.hidden, true);

        const toggle = {
            values: { "data-scenario-dir-toggle": "dir:scenarios", "aria-expanded": "true" },
            getAttribute(name) { return this.values[name]; },
            setAttribute(name, value) { this.values[name] = value; },
            nextElementSibling: {
                hidden: false,
                classList: { contains: (name) => name === "scenario-tree-children" }
            }
        };
        workbenchView.toggleScenarioDir(toggle);
        assert.equal(toggle.values["aria-expanded"], "false");
        assert.equal(toggle.nextElementSibling.hidden, true);

        workbenchView.renderScenarioSelect(all, "scenarios/order/create.js", "", {}, "");
        assert.match(list.innerHTML, /data-scenario-dir-toggle="dir:scenarios" aria-expanded="false"/);

        // 搜索时强制展开，命中的场景不会被折叠目录藏起来
        workbenchView.renderScenarioSelect(all, "scenarios/order/create.js", "create", {}, "");
        assert.match(list.innerHTML, /data-scenario-dir-toggle="dir:scenarios" aria-expanded="true"/);
    } finally {
        delete globalThis.document;
    }
});

// 从 CHANGELOG.md 抽出指定版本的段落，写成 Release 说明文件。
// 用切片而不是正则：版本号里的点和方括号在正则里都要转义，层层嵌套容易出错，
// 而 "## [" 的边界判断是纯字符串比较，读起来也更直白。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const version = process.env.VERSION;
const notesPath = path.resolve(root, process.env.NOTES || "RELEASE_NOTES.md");

if (!version) {
    console.error("缺少 VERSION 环境变量");
    process.exit(1);
}

const changelog = fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf8").split(/\r?\n/);
const heading = `## [${version}]`;
const start = changelog.findIndex((line) => line.startsWith(heading));

if (start === -1) {
    console.warn(`CHANGELOG.md 未找到 ${heading}，退回指向 CHANGELOG`);
    fs.writeFileSync(notesPath, `见 [CHANGELOG.md](CHANGELOG.md)。\n`, "utf8");
    process.exit(0);
}

// 段落到下一个 "## [" 为止
let end = changelog.length;
for (let i = start + 1; i < changelog.length; i += 1) {
    if (changelog[i].startsWith("## [")) { end = i; break; }
}

const body = changelog.slice(start + 1, end).join("\n").trim();
const header = `发布时间：${new Date().toISOString().slice(0, 10)}

安装方式：

\`\`\`powershell
irm https://raw.githubusercontent.com/duyiliu/scenario-test/v${version}/scripts/install.ps1 | iex
\`\`\`

\`\`\`bash
curl -fsSL https://raw.githubusercontent.com/duyiliu/scenario-test/v${version}/scripts/install.sh | bash -s -- . scenario-test
\`\`\`

`;
fs.writeFileSync(notesPath, `${header}${body}\n`, "utf8");
console.log(`Release 说明已生成：${notesPath}（${version}）`);

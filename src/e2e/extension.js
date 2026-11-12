import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFile } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import { isRealPathWithinRoot } from '../utils/path-validator.js';
import { E2E_PAGE } from './page.js';
import { E2E_APP_JS } from './ui/app.generated.js';
import { E2E_REPORTER } from './reporter-template.js';

// v23 起运行时去项目化：结构化 reporter 不再落在项目 .scenario-test/，
// 由 serve 在启动 playwright 时物化到 e2e-results/ 并经 env 注入路径
// reporter 模板按「位于 e2e/ 同级目录」解析 __dirname/../e2e，因此物化到 e2e-results/ 下
// （该目录已 gitignore，天然不污染项目树）
function materializeReporter(resultsDir) {
    const target = path.join(resultsDir, '.scenario-test-e2e-reporter.cjs');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, E2E_REPORTER);
    return target;
}

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.zip': 'application/zip', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webm': 'video/webm' };
const indexKey = value => createHash('sha256').update(value).digest('hex');
const json = (res, code, value) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
function listSpecs(root) {
    const found = [];
    function walk(dir) {
        if (!fs.existsSync(dir)) return;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const file = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(file);
            else if (entry.isFile() && /\.spec\.(?:js|ts|mjs)$/.test(entry.name) && isRealPathWithinRoot(root, file)) found.push(path.relative(root, file).replace(/\\/g, '/'));
        }
    }
    walk(path.join(root, 'tests'));
    return found.sort();
}
export function exactSpecPattern(root, spec) {
    const absolute = path.resolve(root, spec).replace(/\\/g, '/');
    return '^' + absolute.split('/').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[/\\\\]') + '$';
}
function safeArtifact(root, relative) {
    const candidate = path.resolve(root, relative);
    const rel = path.relative(root, candidate);
    if (!rel || rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel) || !isRealPathWithinRoot(root, candidate)) return null;
    return candidate;
}
async function readBody(req) {
    let body = '';
    for await (const part of req) { body += part; if (body.length > 16384) throw new Error('请求体过大'); }
    return body ? JSON.parse(body) : {};
}

export function isE2eProject(workspace) {
    try { return JSON.parse(fs.readFileSync(path.join(workspace, 'e2e', 'package.json'), 'utf8')).scenarioTestE2e === true; }
    catch { return false; }
}
export function createE2eExtension({ workspace }) {
    const root = path.join(workspace, 'e2e');
    const results = path.join(workspace, 'e2e-results');
    let child = null, run = null, stopping = false, disposed = false, stopRequested = false;
    let liveLog = [];
    function append(chunk) {
        liveLog.push(String(chunk));
        if (liveLog.length > 2000) liveLog.shift();
    }
    async function stop() {
        if (!child) return false;
        if (stopping) return true;
        stopping = true;
        stopRequested = true;
        const target = child;
        if (target.pid) {
            if (process.platform === 'win32') {
                try { await new Promise((resolve, reject) => execFile('taskkill', ['/pid', String(target.pid), '/T', '/F'], error => error && child === target ? reject(error) : resolve())); }
                catch (error) { stopping = false; stopRequested = false; throw error; }
            }
            else {
                try {
                    process.kill(-target.pid, 'SIGTERM');
                    const timer = setTimeout(() => { if (child === target) { try { process.kill(-target.pid, 'SIGKILL'); } catch { /* 已退出 */ } } }, 3000);
                    target.once('close', () => clearTimeout(timer));
                } catch { /* 已退出 */ }
            }
        }
        return true;
    }
    async function dispose() {
        if (disposed) return;
        disposed = true;
        const target = child;
        if (target) {
            const closed = new Promise(resolve => target.once('close', resolve));
            await stop();
            let timeout;
            await Promise.race([closed, new Promise(resolve => { timeout = setTimeout(resolve, 3000); })]);
            clearTimeout(timeout);
            if (child === target && process.platform !== 'win32' && target.pid) {
                try { process.kill(-target.pid, 'SIGKILL'); } catch { /* 已退出 */ }
                await Promise.race([closed, new Promise(resolve => setTimeout(resolve, 2000))]);
            }
        }
    }
    async function handle(req, res, pathname) {
        if (pathname === '/e2e') { res.writeHead(302, { Location: '/e2e/' }); res.end(); return true; }
        if (!pathname.startsWith('/e2e/')) return false;
        if (req.method === 'GET' && pathname === '/e2e/') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(E2E_PAGE); return true; }
        if (req.method === 'GET' && pathname === '/e2e/panel.js') { res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(E2E_APP_JS); return true; }
        if (req.method === 'GET' && pathname === '/e2e/api/state') {
            let live = null;
            if (run?.runId && run?.spec) {
                try {
                    const manifest = JSON.parse(fs.readFileSync(path.join(results, run.runId, 'manifest.json'), 'utf8'));
                    if (manifest?.runId === run.runId) live = { steps: manifest.steps?.[run.spec] || [], results: manifest.results?.[run.spec] || [], screenshots: (manifest.screenshots || []).filter(x => x.spec === run.spec), startedAt: manifest.startedAt || run.startedAt };
                } catch { /* reporter 尚未写出清单 */ }
            }
            json(res, 200, { specs: listSpecs(root), running: !!child, spec: run?.spec || null, runId: run?.runId || null, log: liveLog.join(''), live, configSummary: '本地 E2E 环境' }); return true;
        }
        if (req.method === 'POST' && pathname === '/e2e/api/run') {
            let body;
            try { body = await readBody(req); } catch { json(res, 400, { error: '请求体无效' }); return true; }
            if (!body || typeof body !== 'object' || !listSpecs(root).includes(body.spec)) { json(res, 400, { error: '请选择有效测试文件' }); return true; }
            if (child || disposed) { json(res, 409, { error: '已有任务运行或服务正在关闭' }); return true; }
            const cli = path.join(root, 'node_modules', '@playwright', 'test', 'cli.js');
            if (!fs.existsSync(cli)) { json(res, 409, { error: '未安装 Playwright：请在 e2e 目录执行 npm install' }); return true; }
            const id = randomUUID();
            run = { runId: id, spec: body.spec, startedAt: new Date().toISOString() };
            stopRequested = false;
            liveLog = [];
            const args = [cli, 'test', exactSpecPattern(root, body.spec)];
            if (body.headed === true) args.push('--headed');
            const reporterPath = materializeReporter(results);
            child = spawn(process.execPath, args, { cwd: root, shell: false, detached: process.platform !== 'win32', env: { ...process.env, E2E_RUN_ID: id, SCENARIO_TEST_E2E_REPORTER: reporterPath } });
            const target = child;
            target.stdout.on('data', append); target.stderr.on('data', append);
            target.once('error', error => append(`启动失败：${error.message}\n`));
            target.once('close', code => {
                append(`进程退出：${code}\n`);
                const status = stopRequested ? 'interrupted' : 'failed';
                try {
                    const dir = path.join(results, id);
                    const manifestFile = path.join(dir, 'manifest.json');
                    let manifest;
                    try { manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8')); } catch { /* reporter 未启动 */ }
                    if (!manifest?.finishedAt || !manifest.results?.[run.spec]?.length || (code !== 0 && manifest.results[run.spec].every(item => item.status === 'passed'))) {
                        fs.mkdirSync(dir, { recursive: true });
                        manifest = { schemaVersion: 1, runId: id, startedAt: run.startedAt, finishedAt: new Date().toISOString(), status, specs: [run.spec], screenshots: manifest?.screenshots || [], logs: { [run.spec]: [...liveLog] }, results: { [run.spec]: [{ title: run.spec, status, errors: [stopRequested ? '运行已停止' : `运行未完成，退出码 ${code}`] }] }, reportAvailable: false };
                        fs.writeFileSync(manifestFile, JSON.stringify(manifest));
                        const indexDir = path.join(results, 'by-spec'); fs.mkdirSync(indexDir, { recursive: true });
                        fs.writeFileSync(path.join(indexDir, indexKey(run.spec) + '.json'), JSON.stringify({ spec: run.spec, runId: id, startedAt: run.startedAt }));
                    }
                } catch (error) { append(`结果保存失败：${error.message}\n`); }
                if (child === target) child = null; stopping = false;
            });
            json(res, 202, run); return true;
        }
        if (req.method === 'POST' && pathname === '/e2e/api/stop') {
            try {
                if (!(await stop())) { json(res, 409, { error: '没有活动运行' }); return true; }
                json(res, 202, { ok: true });
            } catch { stopping = false; stopRequested = false; json(res, 500, { error: '停止进程失败' }); }
            return true;
        }
        if (req.method === 'GET' && pathname === '/e2e/api/source') {
            const spec = new URL(req.url, 'http://localhost').searchParams.get('spec');
            if (!listSpecs(root).includes(spec)) { json(res, 400, { error: '无效测试文件' }); return true; }
            try {
                const file = path.resolve(root, spec);
                if (!isRealPathWithinRoot(root, file)) throw new Error('路径无效');
                const stat = fs.statSync(file);
                if (!stat.isFile()) throw new Error('文件无效');
                if (stat.size > 524288) { json(res, 413, { error: '文件过大' }); return true; }
                json(res, 200, { spec, content: fs.readFileSync(file, 'utf8') });
            } catch { json(res, 500, { error: '读取测试文件失败' }); }
            return true;
        }
        if (req.method === 'GET' && pathname === '/e2e/api/result') {
            const spec = new URL(req.url, 'http://localhost').searchParams.get('spec');
            if (!listSpecs(root).includes(spec)) { json(res, 400, { error: '无效测试文件' }); return true; }
            try {
                const index = JSON.parse(fs.readFileSync(path.join(results, 'by-spec', indexKey(spec) + '.json'), 'utf8'));
                if (index.spec !== spec || !/^[a-f0-9-]{36}$/i.test(index.runId)) throw new Error('索引无效');
                const file = safeArtifact(results, `${index.runId}/manifest.json`);
                if (!file) throw new Error('清单路径无效');
                const result = JSON.parse(fs.readFileSync(file, 'utf8'));
                if (result.runId !== index.runId || !result.results?.[spec]?.length || !result.finishedAt) throw new Error('清单归属无效');
                json(res, 200, result);
            } catch (error) { if (error.code === 'ENOENT') json(res, 200, null); else json(res, 500, { error: '读取运行结果失败' }); }
            return true;
        }
        if (req.method === 'GET' && pathname.startsWith('/e2e/api/artifacts/')) {
            const rel = pathname.slice('/e2e/api/artifacts/'.length);
            if (!/^[a-f0-9-]{36}\/(?:\d+\.png|report\/.+)$/i.test(rel)) { res.writeHead(404); res.end(); return true; }
            const slash = rel.indexOf('/');
            const runRoot = path.join(results, rel.slice(0, slash));
            const file = safeArtifact(runRoot, rel.slice(slash + 1));
            if (!file || !mime[path.extname(file).toLowerCase()] || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return true; }
            const stream = fs.createReadStream(file);
            stream.on('error', () => { if (res.headersSent) res.destroy(); else { res.writeHead(500); res.end(); } });
            res.on('close', () => { if (!res.writableEnded) stream.destroy(); });
            stream.on('open', () => { res.writeHead(200, { 'Content-Type': mime[path.extname(file).toLowerCase()], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); stream.pipe(res); });
            return true;
        }
        res.writeHead(404); res.end('not found'); return true;
    }
    return { name: 'e2e', handle, dispose };
}

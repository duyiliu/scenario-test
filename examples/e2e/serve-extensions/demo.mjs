const people = [
  { name: '林小雨', age: '3 岁 2 月', number: 'DEMO-001', state: '候诊中', department: '儿内科', doctor: '张医生', registeredAt: '08:10' },
  { name: '周乐乐', age: '5 岁 1 月', number: 'DEMO-002', state: '候诊中', department: '儿内科', doctor: '张医生', registeredAt: '08:22' },
  { name: '陈星星', age: '2 岁 8 月', number: 'DEMO-003', state: '已接诊', department: '儿外科', doctor: '李医生', registeredAt: '08:35' },
  { name: '王浩然', age: '6 岁 3 月', number: 'DEMO-004', state: '候诊中', department: '保健科', doctor: '王医生', registeredAt: '08:47' },
  { name: '李思远', age: '4 岁 5 月', number: 'DEMO-005', state: '已过号', department: '儿内科', doctor: '张医生', registeredAt: '09:03' },
  { name: '张一诺', age: '7 岁 0 月', number: 'DEMO-006', state: '已接诊', department: '皮肤科', doctor: '赵医生', registeredAt: '09:15' },
  { name: '赵可可', age: '3 岁 9 月', number: 'DEMO-007', state: '候诊中', department: '保健科', doctor: '王医生', registeredAt: '09:28' },
  { name: '孙沐阳', age: '5 岁 6 月', number: 'DEMO-008', state: '复诊', department: '儿外科', doctor: '李医生', registeredAt: '09:40' },
  { name: '吴梓涵', age: '2 岁 11 月', number: 'DEMO-009', state: '候诊中', department: '儿内科', doctor: '张医生', registeredAt: '09:52' },
  { name: '郑小满', age: '6 岁 8 月', number: 'DEMO-010', state: '已接诊', department: '皮肤科', doctor: '赵医生', registeredAt: '10:05' },
  { name: '何安然', age: '4 岁 1 月', number: 'DEMO-011', state: '已过号', department: '保健科', doctor: '王医生', registeredAt: '10:18' },
  { name: '徐嘉禾', age: '8 岁 2 月', number: 'DEMO-012', state: '候诊中', department: '儿外科', doctor: '李医生', registeredAt: '10:30' }
];
const accounts = { doctor: '演示医生', nurse: '演示护士' };
const states = [...new Set(people.map(person => person.state))];
const stateOptions = states.map(state => `<option value="${state}">${state}</option>`).join('');
const json = (res, status, value, headers = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(value));
};
const accountOf = req => {
  const value = /(?:^|;\s*)framework_demo=([^;]+)/.exec(req.headers.cookie || '')?.[1];
  return Object.hasOwn(accounts, value) ? value : null;
};
export default {
  name: 'framework-demo',
  async handle(req, res, pathname) {
    const url = new URL(req.url, 'http://localhost');
    if (pathname === '/demo-api/health') {
      json(res, 200, {
        status: 'UP', service: 'framework-demo', environment: 'local-mock',
        uptimeSeconds: Math.floor(process.uptime()),
        dependencies: { database: 'UP', cache: 'UP' }
      }); return true;
    }
    if (pathname === '/demo-api/stats') {
      const byState = people.reduce((acc, person) => { acc[person.state] = (acc[person.state] || 0) + 1; return acc; }, {});
      json(res, 200, { total: people.length, byState }); return true;
    }
    if (pathname === '/demo-api/queue') {
      const keyword = url.searchParams.get('keyword') || '';
      const state = url.searchParams.get('state') || '';
      const matched = people.filter(person => person.name.includes(keyword) && (!state || person.state === state));
      const total = matched.length;
      const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
      const pageSize = Math.max(1, Number(url.searchParams.get('pageSize')) || total || 1);
      const start = (page - 1) * pageSize;
      json(res, 200, { total, page, pageSize, items: matched.slice(start, start + pageSize) }); return true;
    }
    const detail = /^\/demo-api\/queue\/([A-Za-z0-9-]+)$/.exec(pathname);
    if (detail) {
      const person = people.find(item => item.number === detail[1]);
      if (!person) { json(res, 404, { error: '患者不存在' }); return true; }
      json(res, 200, person); return true;
    }
    if (pathname === '/demo-api/login') {
      if (req.method !== 'POST') { json(res, 405, { error: '仅接受 POST' }); return true; }
      let body = '';
      for await (const chunk of req) { body += chunk; if (body.length > 4096) { json(res, 413, { error: '请求过大' }); return true; } }
      let input;
      try { input = JSON.parse(body); } catch { json(res, 400, { error: '请求无效' }); return true; }
      if (!Object.hasOwn(accounts, input?.username) || input.password !== 'demo-only') { json(res, 401, { error: '演示账号无效' }); return true; }
      json(res, 200, { username: input.username, name: accounts[input.username] }, { 'Set-Cookie': `framework_demo=${input.username}; Path=/; HttpOnly; SameSite=Strict` }); return true;
    }
    if (pathname === '/demo-api/logout') {
      if (req.method !== 'POST') { json(res, 405, { error: '仅接受 POST' }); return true; }
      json(res, 200, { ok: true }, { 'Set-Cookie': 'framework_demo=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict' }); return true;
    }
    if (pathname === '/demo-api/me') {
      const account = accountOf(req);
      if (!account) { json(res, 401, { error: '未登录' }); return true; }
      json(res, 200, { username: account, name: accounts[account] }); return true;
    }
    if (pathname === '/demo-app/' || pathname === '/demo-app') {
      const account = accountOf(req);
      const name = account ? accounts[account] : '访客';
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>本地诊室 · 框架演示</title><style>
      *{box-sizing:border-box}body{margin:0;background:#f3f6fa;color:#26364b;font:14px system-ui,"Microsoft YaHei",sans-serif}header{background:#fff;border-bottom:1px solid #e1e7f0;padding:20px 40px;display:flex;justify-content:space-between}main{max-width:1040px;margin:40px auto;padding:0 24px}h1{font-size:26px;margin:0 0 8px}.muted{color:#7b899b}section{margin-top:28px;background:#fff;border:1px solid #e1e7f0;border-radius:12px;overflow:hidden}.bar{display:flex;align-items:center;justify-content:space-between;padding:20px}.filters{display:flex;gap:10px}input,select{padding:10px 12px;border:1px solid #dbe3ee;border-radius:7px;font:inherit;background:#fff}table{width:100%;border-collapse:collapse;text-align:left}th{color:#7b899b;background:#fafbfd;font-weight:500}td,th{padding:16px 20px;border-bottom:1px solid #edf1f6}.badge{padding:4px 8px;background:#edf7f1;color:#398166;border-radius:5px;font-size:12px}
      </style></head><body><header><strong>本地诊室 / 框架测试</strong><span data-testid="account">${name}</span></header><main><h1>候诊工作台</h1><p class="muted">用于验证搜索、筛选、角色与截图的模拟页面，所有数据均为虚构。</p><section><div class="bar"><strong>今日候诊 <span class="muted" id="count">${people.length} 人</span></strong><div class="filters"><input aria-label="搜索患者" placeholder="按姓名搜索"><select aria-label="按状态筛选"><option value="">全部状态</option>${stateOptions}</select></div></div><table><thead><tr><th>患者</th><th>年龄</th><th>就诊编号</th><th>科室</th><th>状态</th></tr></thead><tbody>${people.map(person => `<tr data-state="${person.state}"><td>${person.name}</td><td>${person.age}</td><td>${person.number}</td><td>${person.department}</td><td><span class="badge">${person.state}</span></td></tr>`).join('')}</tbody></table><div id="empty" class="muted" hidden style="padding:24px 20px">未找到匹配患者</div></section></main><script>const search=document.querySelector('input'),filter=document.querySelector('select'),countEl=document.getElementById('count'),emptyEl=document.getElementById('empty');function apply(){let count=0;for(const row of document.querySelectorAll('tbody tr')){const matchName=row.cells[0].textContent.includes(search.value.trim());const matchState=!filter.value||row.dataset.state===filter.value;row.hidden=!(matchName&&matchState);if(!row.hidden)count++;}countEl.textContent=count+' 人';emptyEl.hidden=count>0;}search.oninput=apply;filter.onchange=apply;</script></body></html>`);
      return true;
    }
    return false;
  }
};

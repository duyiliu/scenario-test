const people = [
  { name: '林小雨', age: '3 岁 2 月', number: 'DEMO-001', state: '候诊中' },
  { name: '周乐乐', age: '5 岁 1 月', number: 'DEMO-002', state: '候诊中' },
  { name: '陈星星', age: '2 岁 8 月', number: 'DEMO-003', state: '已接诊' }
];
const accounts = { doctor: '演示医生', nurse: '演示护士' };
const json = (res, status, value, headers = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(value));
};
export default {
  name: 'framework-demo',
  async handle(req, res, pathname) {
    const url = new URL(req.url, 'http://localhost');
    if (pathname === '/demo-api/health') { json(res, 200, { status: 'UP' }); return true; }
    if (pathname === '/demo-api/queue') {
      const items = people.filter(person => person.name.includes(url.searchParams.get('keyword') || ''));
      json(res, 200, { total: items.length, items }); return true;
    }
    if (pathname === '/demo-api/login') {
      if (req.method !== 'POST') { json(res, 405, { error: '仅接受 POST' }); return true; }
      let body = '';
      for await (const chunk of req) { body += chunk; if (body.length > 4096) { json(res, 413, { error: '请求过大' }); return true; } }
      let input;
      try { input = JSON.parse(body); } catch { json(res, 400, { error: '请求无效' }); return true; }
      if (!Object.hasOwn(accounts, input?.username) || input.password !== 'demo-only') { json(res, 401, { error: '演示账号无效' }); return true; }
      json(res, 200, { name: accounts[input.username] }, { 'Set-Cookie': `framework_demo=${input.username}; Path=/; HttpOnly; SameSite=Strict` }); return true;
    }
    if (pathname === '/demo-app/' || pathname === '/demo-app') {
      const account = /(?:^|;\s*)framework_demo=([^;]+)/.exec(req.headers.cookie || '')?.[1];
      const name = Object.hasOwn(accounts, account) ? accounts[account] : '访客';
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>本地诊室 · 框架演示</title><style>
      *{box-sizing:border-box}body{margin:0;background:#f3f6fa;color:#26364b;font:14px system-ui,"Microsoft YaHei",sans-serif}header{background:#fff;border-bottom:1px solid #e1e7f0;padding:20px 40px;display:flex;justify-content:space-between}main{max-width:1040px;margin:40px auto;padding:0 24px}h1{font-size:26px;margin:0 0 8px}.muted{color:#7b899b}section{margin-top:28px;background:#fff;border:1px solid #e1e7f0;border-radius:12px;overflow:hidden}.bar{display:flex;align-items:center;justify-content:space-between;padding:20px}input{padding:10px 12px;border:1px solid #dbe3ee;border-radius:7px;font:inherit}table{width:100%;border-collapse:collapse;text-align:left}th{color:#7b899b;background:#fafbfd;font-weight:500}td,th{padding:16px 20px;border-bottom:1px solid #edf1f6}.badge{padding:4px 8px;background:#edf7f1;color:#398166;border-radius:5px;font-size:12px}
      </style></head><body><header><strong>本地诊室 / 框架测试</strong><span data-testid="account">${name}</span></header><main><h1>候诊工作台</h1><p class="muted">用于验证搜索、角色与截图的模拟页面，所有数据均为虚构。</p><section><div class="bar"><strong>今日候诊 <span class="muted" id="count">3 人</span></strong><input aria-label="搜索患者" placeholder="按姓名搜索"></div><table><thead><tr><th>患者</th><th>年龄</th><th>就诊编号</th><th>状态</th></tr></thead><tbody>${people.map(person => `<tr><td>${person.name}</td><td>${person.age}</td><td>${person.number}</td><td><span class="badge">${person.state}</span></td></tr>`).join('')}</tbody></table></section></main><script>document.querySelector('input').oninput=event=>{let count=0;for(const row of document.querySelectorAll('tbody tr')){row.hidden=!row.cells[0].textContent.includes(event.target.value);if(!row.hidden)count++;}document.getElementById('count').textContent=count+' 人';};</script></body></html>`);
      return true;
    }
    return false;
  }
};

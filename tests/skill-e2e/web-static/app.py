"""演示用最小前端应用：登录页 + 受保护列表 + 同源 API（Node 标准库，无第三方依赖）。"""
import json
from http.server import BaseHTTPRequestHandler, HTTPServer

SESSIONS = {}
ORDERS = {
    "DEMO-1001": {"id": "DEMO-1001", "item": "演示商品A", "amount": 120, "state": "已支付"},
    "DEMO-1002": {"id": "DEMO-1002", "item": "演示商品B", "amount": 80, "state": "待支付"},
}

PAGE = """<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><title>演示订单系统</title></head>
<body>
  <main id="app">
    <h1>演示订单系统</h1>
    <form id="login-form">
      <label>账号 <input name="username" /></label>
      <label>密码 <input name="password" type="password" /></label>
      <button type="submit">登录</button>
    </form>
    <p id="identity">访客</p>
    <p id="error" hidden></p>
    <section id="orders" hidden>
      <h2>订单列表</h2>
      <table id="order-table">
        <thead><tr><th>订单号</th><th>商品</th><th>金额</th><th>状态</th></tr></thead>
        <tbody></tbody>
      </table>
      <button id="logout">退出登录</button>
    </section>
  </main>
  <script>
    const me = () => fetch('/api/me').then(r => r.ok ? r.json() : null);
    const login = async (form) => {
      const res = await fetch('/api/login', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        username: form.username.value, password: form.password.value})});
      const body = await res.json();
      if (!res.ok) { document.getElementById('error').textContent = body.message || '登录失败'; document.getElementById('error').hidden = false; return; }
      document.getElementById('error').hidden = true;
      document.getElementById('identity').textContent = '账号 ' + body.data.username;
      const orders = await (await fetch('/api/orders')).json();
      const tbody = document.querySelector('#order-table tbody');
      tbody.innerHTML = '';
      for (const o of orders.data) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td>'+o.id+'</td><td>'+o.item+'</td><td>'+o.amount+'</td><td>'+o.state+'</td>';
        tbody.appendChild(tr);
      }
      document.getElementById('orders').hidden = false;
    };
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault(); await login(e.target);
    });
    document.getElementById('logout').addEventListener('click', async () => {
      await fetch('/api/logout', {method:'POST'}); location.reload();
    });
    me().then(user => { if (user) document.getElementById('identity').textContent = '账号 ' + user.data.username; });
  </script>
</body>
</html>"""


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/" or self.path.startswith("/index.html"):
            self._html(200, PAGE)
        elif self.path == "/api/me":
            sid = self._session()
            if not sid:
                self._json(401, {"code": 401, "message": "unauthorized"})
                return
            self._json(200, {"code": 0, "data": {"username": SESSIONS[sid]}})
        elif self.path == "/api/orders":
            sid = self._session()
            if not sid:
                self._json(401, {"code": 401, "message": "unauthorized"})
                return
            self._json(200, {"code": 0, "data": list(ORDERS.values())})
        else:
            self._json(404, {"code": 404, "message": "not found"})

    def do_POST(self):
        length = int(self.headers.get("Content-Length") or 0)
        body = json.loads(self.rfile.read(length) or b"{}")
        if self.path == "/api/login":
            if body.get("username") == "demo" and body.get("password") == "demo123":
                sid = "sid-" + body["username"]
                SESSIONS[sid] = body["username"]
                self.send_response(200)
                self.send_header("Set-Cookie", f"sid={sid}; Path=/; HttpOnly")
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"code": 0, "data": {"username": body["username"]}}, ensure_ascii=False).encode("utf-8"))
            else:
                self._json(401, {"code": 401, "message": "账号或密码错误"})
        elif self.path == "/api/logout":
            sid = self._session()
            SESSIONS.pop(sid, None)
            self._json(200, {"code": 0, "data": None})
        else:
            self._json(404, {"code": 404, "message": "not found"})

    def _session(self):
        cookie = self.headers.get("Cookie") or ""
        for part in cookie.split(";"):
            if part.strip().startswith("sid="):
                return part.strip()[4:]
        return None

    def _json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _html(self, status, text):
        body = text.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    HTTPServer(("127.0.0.1", int(__import__("sys").argv[1] if len(__import__("sys").argv) > 1 else 18082)), Handler).serve_forever()

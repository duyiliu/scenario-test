"""演示用最小前端应用（已带自管 Playwright）：与 web-static 相同的页面与 API。

区别：本目录预先包含前端团队自己的 e2e/（自管 Playwright 项目），用于验证
scenario-test 的挂载语义——init --e2e 遇到已有自管 e2e 时不得混入模板，
serve 面板应以只读挂载方式列出并触发这些 spec。
"""
import json
from os import path
from http.server import BaseHTTPRequestHandler, HTTPServer

SESSIONS = {}
ORDERS = {
    "DEMO-1001": {"id": "DEMO-1001", "item": "演示商品A", "amount": 120, "state": "已支付"},
    "DEMO-1002": {"id": "DEMO-1002", "item": "演示商品B", "amount": 80, "state": "待支付"},
}

PAGE = open(path.join(path.dirname(__file__), "page.html"), encoding="utf-8").read()


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
    HTTPServer(("127.0.0.1", int(__import__("sys").argv[1] if len(__import__("sys").argv) > 1 else 18083)), Handler).serve_forever()

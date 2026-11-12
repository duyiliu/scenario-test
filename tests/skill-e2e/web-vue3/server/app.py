"""Vue3 夹具的后端 API：Bearer token 鉴权 + 订单查询（Python 标准库，端口 18084）。"""
import json
import secrets
from os import path
from http.server import BaseHTTPRequestHandler, HTTPServer

SESSIONS = {}  # token -> username
ORDERS = [
    {"id": "DEMO-1001", "item": "演示商品A", "amount": 120, "state": "已支付"},
    {"id": "DEMO-1002", "item": "演示商品B", "amount": 80, "state": "待支付"},
]


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        body = self._read_json()
        if self.path == "/api/login":
            if body.get("username") == "demo" and body.get("password") == "demo123":
                token = "tok-" + secrets.token_hex(8)
                SESSIONS[token] = body["username"]
                self._json(200, {"code": 0, "data": {"token": token, "username": body["username"]}})
            else:
                self._json(401, {"code": 401, "message": "账号或密码错误"})
        elif self.path == "/api/logout":
            token = self._auth()
            SESSIONS.pop(token, None) if token else None
            self._json(200, {"code": 0, "data": None})
        else:
            self._json(404, {"code": 404, "message": "not found"})

    def do_GET(self):
        token = self._auth()
        if not token:
            self._json(401, {"code": 401, "message": "unauthorized"})
            return
        if self.path == "/api/me":
            self._json(200, {"code": 0, "data": {"username": SESSIONS.get(token, "demo")}})
        elif self.path == "/api/orders":
            self._json(200, {"code": 0, "data": list(ORDERS)})
        else:
            self._json(404, {"code": 404, "message": "not found"})

    def _auth(self):
        header = self.headers.get("Authorization") or ""
        return header[7:] if header.startswith("Bearer ") else None

    def _read_json(self):
        length = int(self.headers.get("Content-Length") or 0)
        return json.loads(self.rfile.read(length) or b"{}")

    def _json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    import sys
    HTTPServer(("127.0.0.1", int(sys.argv[1] if len(sys.argv) > 1 else 18084)), Handler).serve_forever()

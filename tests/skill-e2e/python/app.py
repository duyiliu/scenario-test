"""演示用最简单的只读查询 API（Python 标准库，无第三方依赖）。"""
import json
from http.server import BaseHTTPRequestHandler, HTTPServer

USERS = {
    7: {"id": 7, "name": "演示用户", "role": "tester"},
}


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/api/health":
            self._json(200, {"status": "ok"})
        elif self.path == "/api/users":
            self._json(200, {"code": 0, "data": list(USERS.values())})
        elif self.path == "/api/users/7":
            self._json(200, {"code": 0, "data": USERS[7]})
        else:
            self._json(404, {"code": 404, "message": "not found"})

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
    HTTPServer(("127.0.0.1", 18081), Handler).serve_forever()

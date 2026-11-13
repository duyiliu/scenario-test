// 零依赖业务 API 夹具：login（200/401）、users（鉴权）、orders（建-查-删-404）。
// 只绑 127.0.0.1、随机端口、内存态按实例隔离；行为与
// tests/skill-e2e/java-springboot 的接口契约对齐，便于未来 Docker 化时夹具统一。
import http from "node:http";

function json(response, status, payload) {
    response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(payload));
}

export async function startFixtureApi() {
    const orders = new Map();
    let orderSeq = 0;
    const VALID_TOKEN = "token-fixture-123456";

    const server = http.createServer((request, response) => {
        const chunks = [];
        request.on("data", (chunk) => chunks.push(chunk));
        request.on("end", () => {
            const rawBody = Buffer.concat(chunks).toString("utf8");
            const url = new URL(request.url, "http://127.0.0.1");
            const pathname = url.pathname;
            const method = request.method;
            const auth = request.headers.authorization || "";
            let body = {};
            try { body = rawBody ? JSON.parse(rawBody) : {}; } catch { body = {}; }

            if (method === "POST" && pathname === "/login") {
                if (body.username === "demo" && body.password === "demo-pass") {
                    return json(response, 200, { token: VALID_TOKEN, userId: "u-1" });
                }
                return json(response, 401, { code: "BAD_CREDENTIALS" });
            }

            const authed = auth === `Bearer ${VALID_TOKEN}`;

            if (method === "GET" && pathname === "/users/me") {
                if (!authed) return json(response, 401, { code: "UNAUTHORIZED" });
                return json(response, 200, { id: "u-1", username: "demo" });
            }

            if (method === "POST" && pathname === "/orders") {
                if (!authed) return json(response, 401, { code: "UNAUTHORIZED" });
                orderSeq += 1;
                const id = `order-${orderSeq}`;
                const order = { id, item: body.item || "item", qty: body.qty || 1, status: "created" };
                orders.set(id, order);
                return json(response, 201, order);
            }

            const orderMatch = /^\/orders\/([\w-]+)$/.exec(pathname);
            if (orderMatch) {
                if (!authed) return json(response, 401, { code: "UNAUTHORIZED" });
                const id = orderMatch[1];
                if (method === "GET") {
                    const order = orders.get(id);
                    if (!order) return json(response, 404, { code: "NOT_FOUND" });
                    return json(response, 200, order);
                }
                if (method === "DELETE") {
                    if (!orders.delete(id)) return json(response, 404, { code: "NOT_FOUND" });
                    return json(response, 200, { id, deleted: true });
                }
            }

            return json(response, 404, { code: "NO_ROUTE", path: pathname });
        });
    });

    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
    });
    const port = server.address().port;
    return {
        baseUrl: `http://127.0.0.1:${port}`,
        token: VALID_TOKEN,
        close: () => new Promise((resolve) => server.close(resolve))
    };
}

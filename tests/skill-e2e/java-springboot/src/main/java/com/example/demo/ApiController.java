package com.example.demo;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@RestController
@RequestMapping("/api")
public class ApiController {

    private static final String TOKEN = "tok-spring-123";
    private static final String USERNAME = "demo";
    private static final String PASSWORD = "demo123";

    private final AtomicLong orderIdSeq = new AtomicLong(1000);
    private final ConcurrentHashMap<Long, Map<String, Object>> orders = new ConcurrentHashMap<>();

    private boolean authorized(String authorization) {
        return ("Bearer " + TOKEN).equals(authorization);
    }

    private Map<String, Object> ok(Object data) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", 0);
        body.put("data", data);
        return body;
    }

    private ResponseEntity<Map<String, Object>> unauthorized() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", 401);
        body.put("message", "unauthorized");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body);
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> body) {
        if (USERNAME.equals(body.get("username")) && PASSWORD.equals(body.get("password"))) {
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("token", TOKEN);
            data.put("userId", 7);
            return ResponseEntity.ok(ok(data));
        }
        Map<String, Object> error = new LinkedHashMap<>();
        error.put("code", 401);
        error.put("message", "bad credentials");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<Map<String, Object>> user(@PathVariable long id,
                                                    @RequestHeader(value = "Authorization", required = false) String authorization) {
        if (!authorized(authorization)) {
            return unauthorized();
        }
        if (id != 7) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("code", 404);
            body.put("message", "user not found");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
        }
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", 7);
        data.put("name", "演示用户");
        data.put("role", "tester");
        return ResponseEntity.ok(ok(data));
    }

    @PostMapping("/orders")
    public ResponseEntity<Map<String, Object>> createOrder(@RequestBody Map<String, Object> body,
                                                           @RequestHeader(value = "Authorization", required = false) String authorization) {
        if (!authorized(authorization)) {
            return unauthorized();
        }
        long id = orderIdSeq.incrementAndGet();
        Map<String, Object> order = new LinkedHashMap<>();
        order.put("id", id);
        order.put("productId", body.get("productId"));
        order.put("quantity", body.getOrDefault("quantity", 1));
        order.put("status", "CREATED");
        orders.put(id, order);
        return ResponseEntity.status(HttpStatus.CREATED).body(ok(order));
    }

    @GetMapping("/orders/{id}")
    public ResponseEntity<Map<String, Object>> getOrder(@PathVariable long id,
                                                        @RequestHeader(value = "Authorization", required = false) String authorization) {
        if (!authorized(authorization)) {
            return unauthorized();
        }
        Map<String, Object> order = orders.get(id);
        if (order == null) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("code", 404);
            body.put("message", "order not found");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
        }
        return ResponseEntity.ok(ok(order));
    }

    @DeleteMapping("/orders/{id}")
    public ResponseEntity<Map<String, Object>> deleteOrder(@PathVariable long id,
                                                           @RequestHeader(value = "Authorization", required = false) String authorization) {
        if (!authorized(authorization)) {
            return unauthorized();
        }
        Map<String, Object> removed = orders.remove(id);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("deleted", removed != null);
        data.put("id", id);
        return ResponseEntity.ok(ok(data));
    }
}

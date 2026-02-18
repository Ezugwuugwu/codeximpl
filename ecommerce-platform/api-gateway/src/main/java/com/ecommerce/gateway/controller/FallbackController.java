package com.ecommerce.gateway.controller;

import java.time.Instant;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/fallback")
public class FallbackController {

    @RequestMapping("/{serviceName}")
    public ResponseEntity<Map<String, Object>> fallback(@PathVariable("serviceName") String serviceName) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
            "service", serviceName,
            "message", "Service temporarily unavailable. Please retry shortly.",
            "timestamp", Instant.now().toString()));
    }
}

package com.ecommerce.admin.controller;

import com.ecommerce.admin.service.AnalyticsService;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AnalyticsService analyticsService;

    public AdminController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/analytics/overview")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> analyticsOverview(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(analyticsService.overview(jwt.getTokenValue()));
    }

    @GetMapping("/health/platform")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> platformHealth() {
        return ResponseEntity.ok(Map.of(
            "status", "UP",
            "gateway", "HEALTHY",
            "discovery", "HEALTHY",
            "queue", "HEALTHY"));
    }
}

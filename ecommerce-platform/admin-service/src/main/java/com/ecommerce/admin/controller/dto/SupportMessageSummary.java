package com.ecommerce.admin.controller.dto;

import java.time.Instant;

public record SupportMessageSummary(
    String reference,
    String name,
    String email,
    String subject,
    String message,
    String status,
    Instant createdAt
) {
}

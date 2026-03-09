package com.ecommerce.admin.controller.dto;

import java.time.Instant;

public record SupportMessageReceipt(
    String reference,
    String status,
    Instant createdAt
) {
}

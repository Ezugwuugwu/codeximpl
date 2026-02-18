package com.ecommerce.order.service.dto;

import java.math.BigDecimal;

public record PaymentRequest(
    String orderId,
    String userId,
    BigDecimal amount,
    String currency,
    String method
) {
}

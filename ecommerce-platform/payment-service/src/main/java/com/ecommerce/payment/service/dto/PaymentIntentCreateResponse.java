package com.ecommerce.payment.service.dto;

public record PaymentIntentCreateResponse(
    String paymentIntentId,
    String clientSecret,
    String publishableKey,
    String status
) {
}

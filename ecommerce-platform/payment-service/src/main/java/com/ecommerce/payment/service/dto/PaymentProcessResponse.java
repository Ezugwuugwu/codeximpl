package com.ecommerce.payment.service.dto;

public record PaymentProcessResponse(
    String paymentId,
    String status,
    String message
) {
}

package com.ecommerce.order.service.dto;

public record PaymentResponse(
    String paymentId,
    String status,
    String message
) {
}

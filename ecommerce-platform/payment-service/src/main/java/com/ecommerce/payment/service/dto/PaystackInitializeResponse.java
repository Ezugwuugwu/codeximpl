package com.ecommerce.payment.service.dto;

public record PaystackInitializeResponse(
    String reference,
    String accessCode,
    String publicKey
) {
}

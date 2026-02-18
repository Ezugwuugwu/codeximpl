package com.ecommerce.payment.service.dto;

public record StripePaymentIntent(
    String id,
    String clientSecret,
    String status,
    long amountMinor,
    String currency
) {
    public boolean isSucceeded() {
        return "succeeded".equalsIgnoreCase(status);
    }
}

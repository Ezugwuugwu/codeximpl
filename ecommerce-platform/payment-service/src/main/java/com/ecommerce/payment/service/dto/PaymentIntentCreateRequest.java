package com.ecommerce.payment.service.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record PaymentIntentCreateRequest(
    @NotBlank String userId,
    @NotNull @DecimalMin("0.50") BigDecimal amount,
    @NotBlank String currency
) {
}

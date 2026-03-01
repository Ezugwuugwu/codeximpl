package com.ecommerce.payment.service.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record PaystackInitializeRequest(
    @NotBlank String email,
    @NotNull @DecimalMin("1.00") BigDecimal amount,
    String currency
) {
}

package com.ecommerce.order.service.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record OrderItemRequest(
    @NotNull Long productId,
    @NotBlank String productName,
    @NotNull @Min(1) Integer quantity,
    @NotNull @DecimalMin("0.01") BigDecimal unitPrice
) {
}

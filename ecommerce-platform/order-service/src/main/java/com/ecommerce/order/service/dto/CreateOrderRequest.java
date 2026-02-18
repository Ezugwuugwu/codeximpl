package com.ecommerce.order.service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record CreateOrderRequest(
    @NotBlank String userId,
    @Valid @NotEmpty List<OrderItemRequest> items,
    String paymentIntentId
) {
}

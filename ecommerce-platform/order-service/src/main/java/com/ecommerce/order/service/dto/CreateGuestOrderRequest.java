package com.ecommerce.order.service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record CreateGuestOrderRequest(
    @Valid @NotEmpty List<OrderItemRequest> items,
    @Valid @NotNull GuestCustomerRequest customer,
    String paymentIntentId
) {
}

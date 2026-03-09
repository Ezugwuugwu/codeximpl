package com.ecommerce.order.service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record GuestCustomerRequest(
    @NotBlank String firstName,
    @NotBlank String lastName,
    @Email @NotBlank String email,
    @NotBlank String streetAddress,
    @NotBlank String city,
    @NotBlank String state,
    @NotBlank String postalCode,
    @NotBlank String country
) {
}

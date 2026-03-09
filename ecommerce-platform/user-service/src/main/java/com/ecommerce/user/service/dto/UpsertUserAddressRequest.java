package com.ecommerce.user.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpsertUserAddressRequest(
    @NotBlank(message = "Address label is required")
    @Size(max = 80, message = "Address label must be 80 characters or fewer")
    String label,

    @NotBlank(message = "Street address is required")
    @Size(max = 255, message = "Street address must be 255 characters or fewer")
    String streetAddress,

    @NotBlank(message = "City is required")
    @Size(max = 120, message = "City must be 120 characters or fewer")
    String city,

    @NotBlank(message = "State is required")
    @Size(max = 120, message = "State must be 120 characters or fewer")
    String state,

    @Size(max = 40, message = "Postal code must be 40 characters or fewer")
    String postalCode,

    @NotBlank(message = "Country is required")
    @Size(max = 120, message = "Country must be 120 characters or fewer")
    String country,

    boolean defaultAddress
) {
}

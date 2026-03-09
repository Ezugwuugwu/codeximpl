package com.ecommerce.user.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateUserProfileRequest(
    @NotBlank(message = "First name is required")
    @Size(max = 80, message = "First name must be 80 characters or fewer")
    String firstName,

    @NotBlank(message = "Last name is required")
    @Size(max = 80, message = "Last name must be 80 characters or fewer")
    String lastName
) {
}

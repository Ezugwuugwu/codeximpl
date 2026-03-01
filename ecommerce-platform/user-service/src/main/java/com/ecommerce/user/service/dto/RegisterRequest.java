package com.ecommerce.user.service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
    @NotBlank @Size(max = 80, message = "First name is too long") String firstName,
    @NotBlank @Size(max = 80, message = "Last name is too long") String lastName,
    @NotBlank @Size(max = 255, message = "Address is too long") String address,
    @Email @NotBlank String email,
    @NotBlank @Size(min = 8, message = "Password must be at least 8 characters") String password,
    @NotBlank String confirmPassword
) {
}

package com.ecommerce.admin.controller.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SupportMessageRequest(
    @NotBlank(message = "Name is required")
    @Size(max = 255, message = "Name must be 255 characters or fewer")
    String name,

    @NotBlank(message = "Email is required")
    @Email(message = "Enter a valid email address")
    @Size(max = 255, message = "Email must be 255 characters or fewer")
    String email,

    @NotBlank(message = "Subject is required")
    @Size(max = 255, message = "Subject must be 255 characters or fewer")
    String subject,

    @NotBlank(message = "Message is required")
    @Size(min = 10, max = 5000, message = "Message must be between 10 and 5000 characters")
    String message
) {
}

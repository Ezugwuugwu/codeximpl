package com.ecommerce.user.service.dto;

import com.ecommerce.user.domain.Role;

public record AuthResponse(
    String token,
    String email,
    Role role
) {
}

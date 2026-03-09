package com.ecommerce.user.service.dto;

import com.ecommerce.user.domain.AppUser;
import java.time.Instant;

public record UserProfileResponse(
    Long id,
    String email,
    String firstName,
    String lastName,
    String fullName,
    String address,
    String role,
    boolean emailVerified,
    Instant createdAt
) {

    public static UserProfileResponse from(AppUser user) {
        String firstName = normalize(user.getFirstName());
        String lastName = normalize(user.getLastName());
        String fullName = (firstName + " " + lastName).trim();

        return new UserProfileResponse(
            user.getId(),
            user.getEmail(),
            firstName,
            lastName,
            fullName,
            normalize(user.getAddress()),
            user.getRole().name(),
            user.isEnabled(),
            user.getCreatedAt()
        );
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}

package com.ecommerce.user.service.dto;

import com.ecommerce.user.domain.UserAddress;
import java.time.Instant;

public record UserAddressResponse(
    Long id,
    String label,
    String streetAddress,
    String city,
    String state,
    String postalCode,
    String country,
    boolean defaultAddress,
    boolean complete,
    Instant createdAt,
    Instant updatedAt
) {

    public static UserAddressResponse from(UserAddress address) {
        String city = normalize(address.getCity());
        String state = normalize(address.getState());
        String country = normalize(address.getCountry());
        return new UserAddressResponse(
            address.getId(),
            normalize(address.getLabel()),
            normalize(address.getStreetAddress()),
            city,
            state,
            normalize(address.getPostalCode()),
            country,
            address.isDefaultAddress(),
            !city.isBlank() && !state.isBlank() && !country.isBlank(),
            address.getCreatedAt(),
            address.getUpdatedAt()
        );
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}

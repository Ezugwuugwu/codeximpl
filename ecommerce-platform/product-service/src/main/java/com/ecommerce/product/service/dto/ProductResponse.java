package com.ecommerce.product.service.dto;

import com.ecommerce.product.domain.Product;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record ProductResponse(
    Long id,
    String name,
    String description,
    BigDecimal price,
    Integer stock,
    String category,
    List<String> imageUrls,
    Integer imageCount,
    Boolean active,
    Instant updatedAt
) {
    public static ProductResponse summary(Product product) {
        return new ProductResponse(
            product.getId(),
            product.getName(),
            product.getDescription(),
            product.getPrice(),
            product.getStock(),
            product.getCategory(),
            summarizeImages(product.getPrimaryImageUrl()),
            product.getImageCount(),
            product.isActive(),
            product.getUpdatedAt()
        );
    }

    public static ProductResponse detail(Product product) {
        return new ProductResponse(
            product.getId(),
            product.getName(),
            product.getDescription(),
            product.getPrice(),
            product.getStock(),
            product.getCategory(),
            List.copyOf(product.getImageUrls()),
            product.getImageCount(),
            product.isActive(),
            product.getUpdatedAt()
        );
    }

    private static List<String> summarizeImages(String primaryImageUrl) {
        if (primaryImageUrl == null || primaryImageUrl.isBlank()) {
            return List.of();
        }
        return List.of(primaryImageUrl);
    }
}

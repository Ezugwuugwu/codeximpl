package com.ecommerce.order.domain;

public enum OrderStatus {
    CREATED,
    PAYMENT_PENDING,
    PAID,
    FULFILLING,
    SHIPPED,
    DELIVERED,
    CANCELLED
}

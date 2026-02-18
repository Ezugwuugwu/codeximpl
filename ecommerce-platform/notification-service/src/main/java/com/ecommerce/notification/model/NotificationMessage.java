package com.ecommerce.notification.model;

public record NotificationMessage(
    String recipient,
    String subject,
    String body
) {
}
